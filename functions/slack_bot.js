import { App, ExpressReceiver, directMention } from '@slack/bolt';
import axios from 'axios';

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

const chat = async (message) => {
  console.log("CHAT:", message.text);

  const options = {
    method: 'GET',
    url: 'https://generaltalker.p.rapidapi.com/on_slack/',
    params: {
      bot_name: process.env.MY_SLACK_BOT_NAME,
      user_name: message.user,
      channel_token: message.channel,
      user_msg_text: message.text,
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
	  console.log("responseMessage:", responseMessage);
    return `<@${message.user}> ${responseMessage}`;
  }).catch(function (error) {
	  //console.error(error);
    console.log(error.response.status);
    console.log(error.response.statusText);
    //console.log(error.response.data.message);
    return null;
  });
}

app.message(directMention(), async ({ message, say }) => {
  //console.log("message:", message);
  let responseMessage = await chat(message);
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

  //console.log("event.headers:", event.headers);
  if (event.headers['x-slack-retry-num']) {
    console.log("This request have been received already.");
    if (event.headers['x-slack-retry-reason'] === "http_timeout") console.log("because http_timeout");
    return { statusCode: 200, body: JSON.stringify({ message: "No need to resend" }) };
  }

  callback(null, {
    statusCode: 200,
    body: ''
  });
  console.log("calbacked.");

  const slackEvent = {
    body: payload,
    ack: async (response) => {
      return new Promise((resolve, reject) => {
        resolve();
        return {
          statusCode: 200,
          body: ''
        };
      });
    },
  };
  await app.processEvent(slackEvent);

  console.log("returning...");
  return {
    statusCode: 200,
    body: ''
  };
}
