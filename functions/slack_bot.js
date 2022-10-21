import { App, ExpressReceiver } from '@slack/bolt';
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

function parseRequestBody(stringBody) {
  try {
    return JSON.parse(stringBody ?? "");
  } catch {
    return undefined;
  }
}

exports.handler = async (event, context) => {
  console.log(event);
  const payload = parseRequestBody(event.body);
  console.log("payload:", payload);
  if(payload && payload.type && payload.type === 'url_verification') {
    console.log("challenge");
    let result = {
      statusCode: 200,
      body: payload.challenge
    };
    console.log(result);
    return result;
  }

  console.log("not challenge");
  return {
    statusCode: 200,
    body: "OK"
  }
}
