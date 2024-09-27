const AWS = require('aws-sdk');
const core = require('@actions/core');

// User data scripts are run as the root user
const userData = [
  '#!/bin/bash',
  `echo hello > /tmp/log.txt`,
  `aws s3api put-object --bucket githubrunnerdebug20240924081926579900000001 --key log2.txt --body /tmp/log.txt`,
];

/*
#!/bin/bash
echo hello > /tmp/log.txt
aws s3api put-object --bucket githubrunnerdebug20240924081926579900000001 --key log2.txt --body /tmp/log.txt
*/

async function startEc2Instance() {
  const ec2 = new AWS.EC2();
  const params = {
    ImageId: 'ami-07face1d68295e126',
    BlockDeviceMappings: [
      {
        DeviceName: '/dev/xvda',
        Ebs: {
          DeleteOnTermination: true,
        },
      },
    ],
    InstanceType: 'm7g.large',
    MinCount: 1,
    MaxCount: 1,
    UserData: Buffer.from(userData.join('\n')).toString('base64'),
    SubnetId: 'subnet-03240a6d862e46773',
    SecurityGroupIds: ['sg-0a21492c6d9544058'],
    IamInstanceProfile: { Name: 'laborer' },
  };

  try {
    const result = await ec2.runInstances(params).promise();
    const ec2InstanceId = result.Instances[0].InstanceId;
    core.info(`AWS EC2 instance ${ec2InstanceId} is started`);
    return ec2InstanceId;
  } catch (error) {
    core.error('AWS EC2 instance starting error');
    throw error;
  }
}

async function waitForInstanceRunning(ec2InstanceId) {
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

async function main() {
  const instanceId = await startEc2Instance();
  waitForInstanceRunning(instanceId);
}

main();
