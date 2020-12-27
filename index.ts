import express from "express";
import fs from "fs";
import path from "path";
import { BedrockConfiguration } from "./BedrockConfiguration";
import { BedrockDownloadPageParser } from "./BedrockDownloadPageParser";
import { BedrockState } from "./BedrockState";
import { JSONFile } from "./utils/JSONFile";

console.log("Starting");
const state = new BedrockState();
state
  .start()
  .then(() => "done")
  .catch((e) => console.error(e));

const app = express();

console.log("Listening on port 5000");
app.listen(5000);

app.get("/server", (request, response) => {
  response.send(state.state());
});

app.post("/server/update", (request, response) => {
  state.update().then((updated) => response.send({ updated }));
});

app.get("/version", (request, response) => {
  const parser = new BedrockDownloadPageParser();
  parser.getBedrockVersions().then((v) => response.send(v));
});
