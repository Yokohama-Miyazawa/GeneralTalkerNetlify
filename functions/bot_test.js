const axios = require("axios");

const options = {
  method: 'GET',
  url: 'https://generaltalker.p.rapidapi.com/on_slack/',
  params: {
    bot_name: process.env.MY_SLACK_BOT_NAME,
    user_name: 'UserName',
    channel_token: 'channel1',
    user_msg_text: 'カスピ海ってどこにあるの？',
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

const chat = () => {
  axios.request(options).then(function (response) {
    let responseMessage = response.data.response.res;
	  console.log(responseMessage);
    return responseMessage;
  }).catch(function (error) {
	  console.error(error);
    return "ERROR";
  });
}

exports.handler = async (event, context) => {
  return {
    statusCode: 200,
    body: chat()
  }
}
