// @format
import {default as axios} from 'axios';
import * as core from '@actions/core';
import * as github from '@actions/github';

export async function triggerWorkflow(
  apiURL: string,
  circleToken: string,
  parameters: Map<string, boolean>
): Promise<void> {
  const projectEndpoint = `/project/github/${github.context.repo.owner}/${github.context.repo.repo}`;
  let refKey = 'branch';
  if (github.context.ref.startsWith('refs/tags')) {
    refKey = 'tag';
  }
  // GITHUB_REF refers to something similar to refs/heads/bleh or refs/tags/v0.1.1
  // so let's just strip away the first two forward slashes and get the more
  // usuable reference name.
  let strippedRef = github.context.ref.replace(/^.*\/.*\//, '');
  if (github.context.ref.startsWith('refs/pull')) {
    strippedRef = github.context.ref
      .replace(/^.*\/.*\//, '')
      .replace(/\/merge$/, '');
  }
  core.info(strippedRef);
  core.info(refKey);
  const triggerResp = await axios({
    method: 'post',
    url: `${apiURL}${projectEndpoint}`,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json'
    },
    auth: {
      username: circleToken,
      password: ''
    },
    data: {
      [refKey]: strippedRef,
      parameters
    }
  });
  if (triggerResp.status !== 201) {
    throw Error(
      `Error downstream circleci workflow (${triggerResp.status}): ${triggerResp.data}`
    );
  }
}
