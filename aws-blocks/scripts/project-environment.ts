const projectEnvironment = {
  AWS_PROFILE: 'pantrypulse',
  AWS_REGION: 'us-east-2',
  CDK_DEFAULT_REGION: 'us-east-2',
};

export function enforceProjectEnvironment() {
  Object.assign(process.env, projectEnvironment);
}
