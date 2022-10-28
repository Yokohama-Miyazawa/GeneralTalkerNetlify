import { App, ExpressReceiver, directMention } from '@slack/bolt';
import axios from 'axios';

const expressReceiver = new ExpressReceiver({
  signingSecret: `${process.env.SLACK_SIGNING_SECRET}`,
  processBeforeResponse: true
});

const app = new App({
  signingSecret: `${process.env.SLACK_SIGNING_SECRET}`,
  token: `${process.env.SLACK_BOT_TOKEN}`,
  receiver: expressReceiver
});
app.start();

function parseRequestBody(stringBody) {
  try {
    return JSON.parse(stringBody ?? "");
  } catch {
    return undefined;
  }
}

const chat = async (text) => {
  console.log("CHAT:", text);

  const options = {
    method: 'GET',
    url: 'https://generaltalker.p.rapidapi.com/on_slack/',
    params: {
      bot_name: process.env.MY_SLACK_BOT_NAME,
      user_name: process.env.MY_SLACK_BOT_NAME,
      channel_token: 'channel1',
      user_msg_text: text,
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
    return responseMessage;
  }).catch(function (error) {
	  //console.error(error);
    console.log(error.response.status);
    console.log(error.response.statusText);
    //console.log(error.response.data.message);
    return null;
  });
}

app.message(directMention(), async ({ message, say }) => {
  //await say(`${message.text}!`);
  console.log("message:", message);
  let responseMessage = await chat(message.text);
  console.log("responseMessage:", responseMessage);
  if(responseMessage) await say(responseMessage);
});

exports.handler = async (event, context) => {
  const payload = parseRequestBody(event.body);
  if(payload && payload.type && payload.type === 'url_verification') {
    return {
      statusCode: 200,
      body: payload.challenge
    };
  }
  /*
  const slackEvent = {
    body: payload,
    ack: async (response) => {
      return new Promise((resolve, reject) => {
        resolve();
        return {
          statusCode: 200,
          body: response ?? ""
        };
      });
    },
  };
  await app.processEvent(slackEvent);
  */

  return {
    statusCode: 200,
    body: "OK"
  }
}
