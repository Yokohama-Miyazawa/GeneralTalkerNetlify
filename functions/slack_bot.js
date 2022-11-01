import { App, ExpressReceiver, directMention } from '@slack/bolt';
import axios from 'axios';

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

function parseRequestBody(stringBody) {
  try {
    return JSON.parse(stringBody ?? "");
  } catch {
    return undefined;
  }
}

const removeMentionSymbol = (message, idToBeRemoved) => {
  return message.replace(`<@${idToBeRemoved}>`, '');
}

const formatResponseText = (text, userId) => {
  let yourNameWord = '<your_name>';
  return text.includes(yourNameWord) ? text.replaceAll(yourNameWord, `<@${userId}>`) : `<@${userId}> ${text}`;
}

const chat = async (message, botUserId) => {
  let messageText = removeMentionSymbol(message.text, botUserId);
  console.log("CHAT:", messageText);

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
    let responseMessage = formatResponseText(response.data.response.res, message.user);
	  console.log("responseMessage:", responseMessage);
    if(isDailyLimitReached) isDailyLimitReached = false;
    return `<@${message.user}> ${responseMessage}`;
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

app.message(directMention(), async ({ message, context, say }) => {
  let botUserId = context.botUserId;
  let responseMessage = await chat(message, botUserId);
  //let responseMessage = `${message.text}!`;
  console.log("responseMessage:", responseMessage);
  if(responseMessage) await say(responseMessage);
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
