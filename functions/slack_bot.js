import { App, ExpressReceiver, directMention } from '@slack/bolt';
import axios from 'axios';
import FormData from 'form-data';

let isDailyLimitReached = false;

const expressReceiver = new ExpressReceiver({
  signingSecret: `${process.env.SLACK_SIGNING_SECRET}`,
  processBeforeResponse: true,
  unhandledRequestTimeoutMillis: 15000
});

const app = new App({
  signingSecret: `${process.env.SLACK_SIGNING_SECRET}`,
  token: `${process.env.SLACK_BOT_TOKEN}`,
  receiver: expressReceiver
});

// This listener middleware checks if the message is a DM to the bot.
function directMessageToBot () {
  return async ({ message, context, next }) => {
    if(message.channel_type != 'im') return;
    await next();
  };
}

// This listener middleware checks if the message is directed to a thread started by the bot.
function threadByTheBot() {
  return async ({ message, context, next }) => {
    // When context does not have a botUserId in it, then this middleware cannot perform its job. Bail immediately.
    if (context.botUserId === undefined) {
      throw new ContextMissingPropertyError(
        'botUserId',
        'Cannot match threads of the app without a bot user ID. Ensure authorize callback returns a botUserId.',
      );
    }

    if (message.thread_ts == undefined) return;  // This message is not a thread.

    // This thread is not started by the bot.
    if (message.parent_user_id != context.botUserId) {
      if(message.subtype == 'thread_broadcast') {
        if (message.root.user != context.botUserId) return;
      } else {
        return;
      }
    }

    await next();
  };
}

function parseRequestBody(stringBody) {
  try {
    return JSON.parse(stringBody ?? "");
  } catch {
    return undefined;
  }
}

const removeMentionSymbol = (message, idToBeRemoved) => {
  return message.replaceAll(`<@${idToBeRemoved}>`, '');
}

const addMentionMark = (text, userId) => {
  return `<@${userId}> ${text}`;
}

const replaceYourNameToMentionMark = (text, userId) => {
  let yourNameWord = '<your_name>';
  return text.replaceAll(yourNameWord, `<@${userId}>`);
}

const replaceMyNameToMentionMark = (text, botId) => {
  let myNameWord = '<my_name>';
  return text.replaceAll(myNameWord, `<@${botId}>`);
}

const chatA3rtTalk = async (message) => {
  const url = 'https://api.a3rt.recruit.co.jp/talk/v1/smalltalk';
  const apikey = process.env.A3RT_TALK_API_KEY;

  const messageText = message.text.trim();
  console.log("inputText:", messageText);

  let params = new FormData();
  params.append('apikey', apikey);
  params.append('query', messageText);

  axios.post(url, params).then(function (response) {
    const responseMessage = response.data.results[0].reply
    console.log("outputText:", responseMessage);
    return responseMessage;
  }).catch(function (error) {
	  console.error(error);
    return null;
  });
}

const chatGeneralTalker = async (message) => {
  let messageText = message.text.trim();
  console.log("inputText:", messageText);

  const options = {
    method: 'GET',
    url: 'https://generaltalker.p.rapidapi.com/on_slack/',
    params: {
      bot_name: process.env.MY_SLACK_BOT_NAME,
      user_name: message.user,
      channel_token: message.channel,
      user_msg_text: messageText,
      use_detect_user_info: 'true',
      save_only_positive_info: 'true',
      load_only_positive_info: 'true',
      use_change_topic: 'true'
    },
    headers: {
      'X-RapidAPI-Key': process.env.GENERALTALKER_API_KEY,
      'X-RapidAPI-Host': 'generaltalker.p.rapidapi.com'
    }
  };

  return axios.request(options).then(function (response) {
    let responseMessage = response.data.response.res;
	  console.log("outputText:", responseMessage);
    if(isDailyLimitReached) isDailyLimitReached = false;
    return responseMessage;
  }).catch(function (error) {
    console.log(error.response.status);
    console.log(error.response.statusText);
    //console.log(error.response.data.message);
    if(!isDailyLimitReached) {
      isDailyLimitReached = true;
      return "今日はもう喋りたくない";
    }
    return null;
  });
}

app.message(directMessageToBot(), async ({ message, context, say }) => {
  let botUserId = context.botUserId;
  let inputText = {
    text: removeMentionSymbol(message.text, botUserId),
    user: message.user,
    channel: message.channel
  };
  let outputText = await chatA3rtTalk(inputText);
  console.log("outputText:", outputText);
  //let outputText = `${removeMentionSymbol(message.text, botUserId)}(＾ω＾)`;
  if (outputText) {
    let responseMessage = replaceMyNameToMentionMark(replaceYourNameToMentionMark(outputText, message.user), botUserId);
    console.log("responseMessage:", responseMessage);
    await say(responseMessage);
  }
});

app.message(directMention(), async ({ message, context, say }) => {
  let botUserId = context.botUserId;
  let inputText = {
    text: removeMentionSymbol(message.text, botUserId),
    user: message.user,
    channel: message.channel
  };
  let outputText = await chatA3rtTalk(inputText);
  //let outputText = `${removeMentionSymbol(message.text, botUserId)}!`;
  if (outputText) {
    let responseMessage = addMentionMark(replaceMyNameToMentionMark(replaceYourNameToMentionMark(outputText, message.user), botUserId), message.user);
    console.log("responseMessage:", responseMessage);
    await say(responseMessage);
  }
});

app.message(threadByTheBot(), async ({ message, context }) => {
  let botUserId = context.botUserId;
  let inputText = {
    text: removeMentionSymbol(message.text, botUserId),
    user: message.user,
    channel: message.channel
  };
  let outputText = await chatA3rtTalk(inputText);
  //let outputText = `${removeMentionSymbol(message.text, botUserId)}?`;
  if (outputText) {
    let responseMessage = replaceMyNameToMentionMark(replaceYourNameToMentionMark(outputText, message.user), botUserId);
    console.log("responseMessage:", responseMessage);
    await app.client.chat.postMessage({
      token: process.env.SLACK_BOT_TOKEN,
      channel: message.channel,
      thread_ts: message.ts,
      text: responseMessage
    });
  }
});

exports.handler = async (event, context, callback) => {
  const payload = parseRequestBody(event.body);
  if(payload && payload.type && payload.type === 'url_verification') {
    return {
      statusCode: 200,
      body: payload.challenge
    };
  }

  if (event.headers['x-slack-retry-num']) {
    console.log(`This request have been received already. #${event.headers['x-slack-retry-num']}`);
    if (event.headers['x-slack-retry-reason'] === "http_timeout") console.log("because http_timeout");
    return { statusCode: 200, body: JSON.stringify({ message: "No need to resend" }) };
  }

  callback(null, {
    statusCode: 202,
    body: JSON.stringify({})
  });
  console.log("calbacked.");

  const slackEvent = {
    body: payload,
    ack: async (response) => {return new Promise((resolve, reject) => resolve());},
  };
  await app.processEvent(slackEvent);

  console.log("returning...");
  return {
    statusCode: 200,
    body: JSON.stringify({})
  };
}
