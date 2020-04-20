// @format
import * as core from '@actions/core';
import * as github from '@actions/github';
import * as circle from './circleci';
import * as config from './config';

async function run(): Promise<void> {
  try {
    const token = core.getInput('repo-token', {required: true});
    const circleToken = core.getInput('circleci-token', {required: true});
    const configPath = core.getInput('configuration-path', {required: true});
    const client = new github.GitHub(token);
    await circle.triggerWorkflow(
      'https://circleci.com/api/v2',
      circleToken,
      await config.getCircleCIParameters(client, configPath)
    );
  } catch (error) {
    core.setFailed(error.stack);
  }
}

run();
