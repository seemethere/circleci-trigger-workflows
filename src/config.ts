// @format
import * as core from '@actions/core';
import * as github from '@actions/github';
import * as yaml from 'js-yaml';

export async function fetchConfig(
  client: github.GitHub,
  configPath: string
): Promise<string> {
  core.info(`Gathering configuration from ${configPath}@${github.context.sha}`);
  const resp = await client.repos.getContents({
    ...github.context.repo,
    path: configPath,
    ref: github.context.sha
  });
  core.debug(JSON.stringify(resp));
  if (resp.status !== 200) {
    throw Error(
      `Content ${configPath}@${github.context.sha} not found: ${resp.status}`
    );
  }
  if (Array.isArray(resp.data)) {
    throw Error(
      `Content ${configPath}@${github.context.sha} does not appear to be a single file`
    );
  }
  const {
    data: {content, encoding}
  } = resp;
  if (content === undefined || encoding === undefined) {
    throw Error(
      `Content ${configPath}@${github.context.sha} does not appear to be readable`
    );
  }
  core.debug(`Content looks like: ${content}`);
  // TODO: Not make this so bad
  //@ts-ignore
  return Buffer.from(content, encoding).toString();
}

export interface GithubLabel {
  labelName: string;
  circleciParameter: string;
}

export async function genLabelMapFromConfig(
  content: string
): Promise<GithubLabel[]> {
  const ret = new Array<GithubLabel>();
  const configObj = yaml.safeLoad(content);
  core.debug(JSON.stringify(configObj));
  for (const label of configObj.github_labels) {
    core.debug(`label -> ${JSON.stringify(label)}`);
    const labelObj: GithubLabel = {
      labelName: label.github_label as string,
      circleciParameter: label.circleci_parameter as string
    };
    ret.push(labelObj);
    core.debug(`${label.github_label} -> ${label.circleci_parameter}`);
  }
  return ret;
}

export async function getLabels(
  client: github.GitHub,
  configPath: string
): Promise<GithubLabel[]> {
  return genLabelMapFromConfig(await fetchConfig(client, configPath));
}
