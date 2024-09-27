import * as core from '@actions/core';
import * as github from '@actions/github';

class Config {
  ec2ImagePrefix = 'cicd-laborer-';
  subnetId = 'subnet-03240a6d862e46773';
  securityGroupId = 'sg-0a21492c6d9544058';
  iamRoleName = 'laborer';
  runnerHomeDir = '/actions-runner';
  env = {};
  input = {
    githubToken: core.getInput('github-token'),
    mode: core.getInput('mode'),
    ec2InstanceType: core.getInput('ec2-instance-type'),
    label: core.getInput('label'),
    ec2InstanceId: core.getInput('ec2-instance-id'),
  };
  // +          aws-resource-tags: > # optional, requires additional permissions
  // +            [
  // +              {"Key": "Name", "Value": "ec2-github-runner"},
  // +              {"Key": "GitHubRepository", "Value": "${{ github.repository }}"}
  // +            ]

  // const tags = JSON.parse(core.getInput('aws-resource-tags'));
  // this.tagSpecifications = null;
  // if (tags.length > 0) {
  //   this.tagSpecifications = [{ResourceType: 'instance', Tags: tags}, {ResourceType: 'volume', Tags: tags}];
  // }

  // the values of github.context.repo.owner and github.context.repo.repo are taken from
  // the environment variable GITHUB_REPOSITORY specified in "owner/repo" format and
  // provided by the GitHub Action on the runtime
  githubContext = {
    owner: github.context.repo.owner,
    repo: github.context.repo.repo,
  };

  constructor() {
    try {
      if (!this.input.mode) {
        throw new Error(`The 'mode' input is not specified`);
      }

      if (!this.input.githubToken) {
        throw new Error(`The 'github-token' input is not specified`);
      }

      if (this.input.mode === 'start') {
        if (!this.input.ec2InstanceType) {
          throw new Error(`ec2-instance-type must be provided for 'start' mode`);
        }
      } else if (this.input.mode === 'stop') {
        if (!this.input.label || !this.input.ec2InstanceId) {
          throw new Error(`both label and ec2-instance-id are required for the 'stop' mode`);
        }
      } else {
        throw new Error('Wrong mode. Allowed values: start, stop.');
      }
    } catch (error) {
      core.error(error as Error);
      core.setFailed((error as Error).message);
      throw error;
    }
  }

  generateUniqueLabel() {
    return Math.random().toString(36).substr(2, 5);
  }
}

export const config = new Config();
