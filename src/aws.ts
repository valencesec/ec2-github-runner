import * as AWS from 'aws-sdk';
import * as core from '@actions/core';
import { config } from './config';

// User data scripts are run as the root user
function buildUserDataScript(githubRegistrationToken: string, label: string) {
  return [
    '#!/bin/bash',
    `cd "${config.runnerHomeDir}"`,
    // `echo "${config.input.preRunnerScript}" > pre-runner-script.sh`,
    // 'source pre-runner-script.sh',
    'export RUNNER_ALLOW_RUNASROOT=1',
    `./config.sh --url https://github.com/${config.githubContext.owner}/${config.githubContext.repo} --token ${githubRegistrationToken} --labels ${label}`,
    './run.sh',
  ];
}

export async function startEc2Instance(label: string, githubRegistrationToken: string): Promise<string> {
  const ec2 = new AWS.EC2();

  const imagesResponse = await ec2.describeImages({ Owners: ['self'] }).promise();
  const images = imagesResponse.Images?.filter((image) => image.Name?.startsWith(config.ec2ImagePrefix)) || [];
  if (images.length === 0) {
    throw new Error('No images found');
  }
  images.sort((a, b) => (a.Name || '').localeCompare(b.Name || ''));
  const latestImage = images[images.length - 1];
  const imageId = latestImage.ImageId;

  const userData = buildUserDataScript(githubRegistrationToken, label);

  const params = {
    ImageId: imageId,
    InstanceType: config.input.ec2InstanceType,
    MinCount: 1,
    MaxCount: 1,
    UserData: Buffer.from(userData.join('\n')).toString('base64'),
    SubnetId: config.subnetId,
    SecurityGroupIds: [config.securityGroupId],
    IamInstanceProfile: { Name: config.iamRoleName },
    InstanceInitiatedShutdownBehavior: 'terminate',
    BlockDeviceMappings: [
      {
        DeviceName: '/dev/xvda',
        Ebs: {
          DeleteOnTermination: true,
        },
      },
    ],
  };

  try {
    const result = await ec2.runInstances(params).promise();
    const ec2InstanceId = result.Instances![0].InstanceId!;
    core.info(`AWS EC2 instance ${ec2InstanceId} is started`);
    return ec2InstanceId;
  } catch (error) {
    core.error('AWS EC2 instance starting error');
    throw error;
  }
}

export async function terminateEc2Instance() {
  const ec2 = new AWS.EC2();

  const params = {
    InstanceIds: [config.input.ec2InstanceId],
  };

  try {
    await ec2.terminateInstances(params).promise();
    core.info(`AWS EC2 instance ${config.input.ec2InstanceId} is terminated`);
    return;
  } catch (error) {
    core.error(`AWS EC2 instance ${config.input.ec2InstanceId} termination error`);
    throw error;
  }
}

export async function waitForInstanceRunning(ec2InstanceId: string) {
  const ec2 = new AWS.EC2();

  const params = {
    InstanceIds: [ec2InstanceId],
  };

  try {
    await ec2.waitFor('instanceRunning', params).promise();
    core.info(`AWS EC2 instance ${ec2InstanceId} is up and running`);
    return;
  } catch (error) {
    core.error(`AWS EC2 instance ${ec2InstanceId} initialization error`);
    throw error;
  }
}
