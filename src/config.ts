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
export async function genLabelMapFromConfig(
  content: string
): Promise<Map<string, string>> {
  const ret = new Map<string, string>();
  const configObj = yaml.safeLoad(content);
  core.debug(JSON.stringify(configObj));
  for (const label of configObj.github_labels) {
    core.debug(`label -> ${JSON.stringify(label)}`);
    ret.set(label.github_label as string, label.circleci_parameter as string);
    core.debug(`${label.github_label} -> ${label.circleci_parameter}`);
  }
  return ret;
}

export async function getLabelsFromConfig(
  client: github.GitHub,
  configPath: string
): Promise<Map<string, string>> {
  return genLabelMapFromConfig(await fetchConfig(client, configPath));
}

export async function getAppliedLabels(
  client: github.GitHub,
  prNumber: number
): Promise<Set<string>> {
  core.info(`Grabbing issue labels for issue #${prNumber}`);
  const {data: currentLabels, status} = await client.issues.listLabelsOnIssue({
    ...github.context.repo,
    // eslint-disable-next-line @typescript-eslint/camelcase
    issue_number: prNumber
  });
  if (status !== 200) {
    throw Error(`Error grabbing labels for ${prNumber}: ${currentLabels}`);
  }
  return new Set<string>(currentLabels.map(l => l.name));
}

export async function getCircleCIParameters(
  client: github.GitHub,
  configPath: string
): Promise<Map<string, boolean>> {
  const parameters = new Map<string, boolean>();
  const configLabels = await getLabelsFromConfig(client, configPath);
  // Check if we're on a pull request
  if (github.context.payload.pull_request) {
    const appliedLabels = await getAppliedLabels(
      client,
      github.context.payload.pull_request.number
    );
    for (const label of appliedLabels) {
      if (configLabels.get(label)) {
        parameters.set(configLabels.get(label) as string, true);
      }
    }
  } else {
    core.info(
      'Detecting non PR branch, choosing to check all parameters as true'
    );
    for (const parameter of configLabels.values()) {
      parameters.set(parameter, true);
    }
  }
  return parameters;
}
