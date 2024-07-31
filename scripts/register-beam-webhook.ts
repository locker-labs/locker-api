import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "../.env.scripts") });

const url = `${process.env.BEAM_BASE_URL}/webhooks`;
console.log("url: ", url);
const authUsername = process.env.BEAM_USERNAME;
console.log("authUsername: ", authUsername);
const authPassword = process.env.BEAM_PASSWORD;
console.log("authPassword: ", authPassword);
const callbackUrl = `${process.env.BEAM_CALLBACK_BASE_URL}/integrations/beam/webhook`;
console.log("callbackUrl: ", callbackUrl);

// Webhook can only be created once
// const webhookOptions = {
// 	method: "POST",
// 	headers: {
// 		accept: "application/json",
// 		"content-type": "application/json",
// 		Authorization: `Bearer ${process.env.BEAM_API_KEY}`,
// 	},
// 	body: JSON.stringify({ authUsername, authPassword, callbackUrl }),
// };
// console.log("webhookOptions: ", webhookOptions);

// fetch(url, options)
// 	.then(async (res) => {
// 		console.log("Got respone");
// 		console.log(res.status);
// 		console.log(await res.text());
// 	})
// 	.then((res) => res.json())
// 	.then((json) => console.log(json))
// 	.catch((err) => console.error(`error:${err}`));

// const optionsGetWebhook = {
// 	method: "GET",
// 	headers: {
// 		accept: "application/json",
// 		Authorization: `Bearer ${process.env.BEAM_API_KEY}`,
// 	},
// };
// console.log("optionsGetWebhook: ", optionsGetWebhook);

// const resp = fetch(url, optionsGetWebhook)
// 	.then((res) => res.json())
// 	.then((json) => console.log(json))
// 	.catch((err) => console.error(`error:${err}`));

// const { id } = resp[0];

const updateWebhookOptions = {
	method: "PUT",
	headers: {
		accept: "application/json",
		"content-type": "application/json",
		Authorization: `Bearer ${process.env.BEAM_API_KEY}`,
	},
	body: JSON.stringify({ authUsername, authPassword, callbackUrl }),
};
console.log("updateWebhookOptions: ", updateWebhookOptions);

fetch(url, updateWebhookOptions)
	.then((res) => res.json())
	.then((json) => console.log(json))
	.catch((err) => console.error(`error:${err}`));
