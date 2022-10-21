import { App, ExpressReceiver } from '@slack/bolt';
import { WebClient } from '@slack/web-api';
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

const web = new WebClient(process.env.SLACK_BOT_TOKEN);

function parseRequestBody(stringBody) {
  try {
    return JSON.parse(stringBody ?? "");
  } catch {
    return undefined;
  }
}

exports.handler = async (event, context) => {
  //console.log(event);
  const payload = parseRequestBody(event.body);
  //console.log("payload:", payload);
  if(payload && payload.type && payload.type === 'url_verification') {
    console.log("challenge");
    return {
      statusCode: 200,
      body: payload.challenge
    };
  }

  console.log("not challenge");
  const result = await web.chat.postMessage({
    token: process.env.SLACK_BOT_TOKEN,
    text: body.text,
    channel: body.channel_id,
  });
  console.log("result:", result);
  return {
    statusCode: 200,
    body: "OK"
  }
}
