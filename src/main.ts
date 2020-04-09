// @format
import * as core from '@actions/core';
import * as github from '@actions/github';
import * as config from './config';

async function run(): Promise<void> {
  try {
    const token = core.getInput('repo-token', {required: true});
    // let circleToken = core.getInput('circleci-token', {required: true});
    const configPath = core.getInput('configuration-path', {required: true});
    const client = new github.GitHub(token);
    const labels = await config.getLabels(client, configPath);
    core.debug(JSON.stringify(labels));
  } catch (error) {
    core.setFailed(error.stack);
  }
}

run();
