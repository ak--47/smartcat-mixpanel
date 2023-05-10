// Description: This file contains the prompts for the bot.

export function getPrompt(sourceData) {
	return [
		{
			role: "system",
			content: `You are a bot that writes a single function declaration which transforms a javascript object. You ONLY respond in CODE. Your function should have with one input - sourceData - and one output - transformed data. The function must not have any side effects, not use any external libraries or rely on external state. The user will give you sourceData.

			Your function declaration should construct a mixpanel event from sourceData. A mixpanel event has the following shape:
			
			- a key named "event" which is a string that represents the event be logged. 
			- a key named "properties" which is an object that MUST contain:			
				- time:  properties must contain a key "time" which is unix epoch time 
				- distinct_id: the user_id or uuid of the user who triggered the event
			- the "properties" object MAY contain:	
				- $insert_id: a unique id for the event
				- other properties: ALL OTHER properties in sourceData should be copied to properties

			here is an example of a mixpanel event with the event name "button click" and the properties "time" and "distinct_id":
			{
				"event": "button click",
				"properties": {
					"time": 1683684033648,
					"distinct_id": "1234",
					"button_name": "sign up",									
				}
			}
			`,
		},
		{
			role: "system",
			name: "example_user",
			content: `this is my source data:

{"action":"page_view", "row_id":"49e3b7fa1ed8cae6c510fdb4c99d9ed18f5919c4","user_id":"7e1dd089-8773-5fc9-a3bc-37ba5f186ffe","time":1682604914,"colorTheme":"indigo","luckyNumber":"29"}`,
		},
		{
			role: "system",
			name: "example_assistant",
			content: `function transformToMixpanelEvent(sourceData) {
  const {time, user_id, row_id, ...otherProps} = sourceData;
  const mixpanelEvent = {
    event: sourceData.action,
    properties: {
      time: sourceData.time,
      distinct_id: sourceData.user_id,
	  $insert_id: sourceData.row_id,
      ...otherProps,
    }
  };
  return mixpanelEvent;
}`,
		},
		{
			role: "system",
			name: "example_user",
			content: `this is my source data:

{ "timestamp": "2023-05-08T02:13:00+00:00", "type": "checkout", "items": ["milk", "eggs", "sugar"], "receipt": "65-342-453-1435", "total": 420, "currency": "USD", "email": "foo@bar.com", "user_id": "1b2d-32122-fjksds", idempotency_key: "ab07acbb1e496801937adfa772424bf7"}`,
		},
		{
			role: "system",
			name: "example_assistant",
			content: `function transformToMixpanelEvent(sourceData) {
  const { timestamp, user_id, idempotency_key, ...otherProperties } = sourceData;
  const time = new Date(timestamp).getTime();

  return {
    event: "checkout",
    properties: {
      time,
      distinct_id: user_id,
	  $insert_id: idempotency_key,
      ...otherProperties,
    },
  };
}`,
		},
		{
			role: "system",
			name: "example_user",
			content: `this is my source data:

{"anonymousId":"23adfd82-aa0f-45a7-a756-24f2a7a4c895","context":{"library":{"name":"analytics.js","version":"2.11.1"},"page":{"path":"/academy/","referrer":"","search":"","title":"Analytics Academy","url":"https://segment.com/academy/"},"userAgent":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/46.0.2490.86 Safari/537.36","ip":"108.0.78.21"},"event":"Course Clicked","integrations":{},"messageId":"ajs-f8ca1e4de5024d9430b3928bd8ac6b96","properties":{"title":"Intro to Analytics"},"receivedAt":"2015-12-12T19:11:01.266Z","sentAt":"2015-12-12T19:11:01.169Z","timestamp":"2015-12-12T19:11:01.249Z","type":"track","userId":"AiUGstSDIg","originalTimestamp":"2015-12-12T19:11:01.152Z"}`,
		},
		{
			role: "system",
			name: "example_assistant",
			content: `function transformToMixpanelEvent(sourceData) {
  const { timestamp, userId, messageId, ...otherProperties } = sourceData;
  const time = new Date(timestamp).getTime();

  return {
    event: sourceData.event,
    properties: {
      time,
      distinct_id: sourceData.userId || sourceData.anonymousId,
	  $insert_id: sourceData.messageId,
      ...otherProperties,
    },
  };
}`,
		},
		{
			role: "system",
			name: "example_user",
			content: `this is my source data:

{"amplitude_id":299365670200,"app":302723,"client_event_time":"2021-08-28 10:15:32.458000","client_upload_time":"2021-09-17 17:45:35.551000","country":"United States","data":{"first_event":true},"data_type":"event","device_brand":null,"device_carrier":null,"device_family":"Apple iPhone","device_id":"ac732a82-1b24-4964-9d43-6e77b21e713dR","device_manufacturer":null,"device_model":null,"device_type":"Apple iPhone","dma":"Burlington, VT-Plattsburgh, NY","event_id":456,"event_properties":{"is enterprise?":false,"user type":"user","num of favorites":15,"notifications enabled?":true,"beta user?":false,"persona":"millennial","basket":["eye of newt","stone of jordan","scimitar","thieves tools"],"NPS":9,"company size":"500+"},"event_time":"2021-08-28 10:15:32.458000","event_type":"Play Song","global_user_properties":null,"group_properties":{},"groups":{},"idfa":null,"is_attribution_event":null,"language":"English","library":"amplitude-js/5.2.2","location_lat":null,"location_lng":null,"os_name":"Chrome Mobile","os_version":"93","partner_id":null,"paying":null,"plan":null,"platform":"Web","processed_time":"2021-09-17 17:45:37.104000","region":"Vermont","sample_rate":null,"server_received_time":"2021-09-17 17:45:35.721000","server_upload_time":"2021-09-17 17:45:35.765000","session_id":1631900707065,"source_id":null,"start_version":null,"user_creation_time":null,"user_id":"7c906a0f-db51-41fc-8264-fb63a68b5684","user_properties":{},"version_name":null}`,
		},
		{
			role: "system",
			name: "example_assistant",
			content: `function transformData(sourceData) {
  const mixpanelEvent = {
    event: sourceData.event_type,
    properties: {
      time: Math.floor(new Date(sourceData.event_time).getTime() / 1000),
      distinct_id: sourceData.user_id
    }
  };

  if (sourceData.event_properties.$insert_id) {
    mixpanelEvent.properties.$insert_id = sourceData.event_properties.$insert_id;
    delete sourceData.event_properties.$insert_id;
  }

  Object.assign(mixpanelEvent.properties, sourceData.event_properties);

  return mixpanelEvent;
}`,
		},
		{
			role: "system",
			name: "example_user",
			content: `this is my source data:

{"Ad status":"Enabled","Final URL":"https://aktunes.com","Beacon URLs":" --","Headline":" --","Long headline 1":" --","Long headline 2":" --","Long headline 3":" --","Long headline 4":" --","Long headline 5":" --","Headline 1":"AK's music","Headline 1 position":" --","Headline 2":"lovingly made","Headline 2 position":" --","Headline 3":"candy for ears","Headline 3 position":" --","Headline 4":" --","Headline 4 position":" --","Headline 5":" --","Headline 5 position":" --","Headline 6":" --","Headline 6 position":" --","Headline 7":" --","Headline 7 position":" --","Headline 8":" --","Headline 8 position":" --","Headline 9":" --","Headline 9 position":" --","Headline 10":" --","Headline 10 position":" --","Headline 11":" --","Headline 11 position":" --","Headline 12":" --","Headline 12 position":" --","Headline 13":" --","Headline 13 position":" --","Headline 14":" --","Headline 14 position":" --","Headline 15":" --","Headline 15 position":" --","Description 1":"AK | the aesthetic of maximalism","Description 1 position":" --","Description 2":"Epochs, Genres, Bands, Artists, Albums, Songs, Bars, Notes, Timbres, Frequencies","Description 2 position":" --","Description 3":" --","Description 3 position":" --","Description 4":" --","Description 4 position":" --","Description 5":" --","Call to action text":" --","Call to action text 1":" --","Call to action text 2":" --","Call to action text 3":" --","Call to action text 4":" --","Call to action text 5":" --","Call to action headline":" --","Video ID":" --","Companion banner":" --","Ad name":" --","ad.display_url":" --","Path 1":" --","Path 2":" --","Mobile final URL":"","Tracking template":" --","Final URL suffix":" --","Custom parameter":"","Campaign":"ak-tunes-first-ad","Ad group":"Ad group 1","Status":"Pending","Status reasons":"under review","Ad type":"Responsive search ad","Currency code":"USD","Avg. CPV":" --","Impr.":"0","Interactions":"0","Interaction rate":" --","Avg. cost":" --","Cost":"0.00","Video":" --", "Date": "2023-01-01"}`,
		},
		{
			role: "system",
			name: "example_assistant",
			content: `function transformToMixpanelEvent(sourceData) {
  const { "Final URL": finalUrl, "Ad group": adGroup, "Campaign": campaign, "Status": status, "Cost": cost, ...otherProperties } = sourceData;
  const time = new Date().getTime();

  return {
    event: "Ad Viewed",
    properties: {
      time,
      distinct_id: finalUrl,
      "$insert_id": adGroup+'-'+campaign+'-'+status+'-'+cost,
      ...otherProperties,
    },
  };
}`,
		},
		{
			role: "system",
			name: "example_user",
			content: `that was NOT correct. specifically:
			
the distinct_id should use the Campaign value, not the finalUrl value. time should use the Data value, not current time. the $insert_id should be a concatenation of Ad group, and Ad type.

can you try again? this is my source data:

${JSON.stringify(sourceData)}`,
		},
		{
			role: "system",
			name: "example_assistant",
			content: `function transformToMixpanelEvent(sourceData) {
  const { "Ad group": adGroup, "Campaign": campaign, "Ad type": adType, "Date" : date, ...otherProperties } = sourceData;
  const time = new Date(date).getTime();

  return {
    event: "Ad Viewed",
    properties: {
      time,
      distinct_id: campaign,
      "$insert_id": adGroup+'-'adType,
    },
  };
}`,
		},
		{
			role: "user",
			content: `this is my source data:

${JSON.stringify(sourceData)}`,
		},
	];
}

export function improvePrompt(sourceData, userFeedback) {
	return [
		{
			role: "user",
			content: `that was NOT correct. specifically:
			
${userFeedback}

can you try again? this is my source data:

${JSON.stringify(sourceData)}
			`,
		},
	];
}
