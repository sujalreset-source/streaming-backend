export default {
  env: "staging",
  port: process.env.PORT,
  mongoUri: process.env.MONGO_URL,
  jwtSecret: process.env.jwt_secret,
  frontendUrl: process.env.FRONTEND_URL,
  
  stripeSecretKey: process.env.STRIPE_SECRET_KEY,
  stripePublishableKey: process.env.Stripe_Publishable_Key,
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
  
  razorpayKeyId: process.env.RAZORPAY_KEY_ID,
  razorpayKeySecret: process.env.RAZORPAY_KEY_SECRET,
  razorpayWebhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET,

  paypalClientId: process.env.PAYPAL_CLIENT_ID,
  paypalSecret: process.env.PAYPAL_CLIENT_SECRET,
  paypalApi: process.env.PAYPAL_API,
  paypalWebhookId: process.env.PAYPAL_WEBHOOK_ID,

  smtpHost: process.env.SMTP_HOST,
  smtpPort: process.env.SMTP_PORT,
  smtpUser: process.env.SMTP_USER,
  smtpPass: process.env.SMTP_PASS,

  awsAccessKeyId: process.env.AWS_ACCESS_KEY_ID,
  awsSecretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  awsRegion: process.env.AWS_REGION,
  awsS3Bucket: process.env.AWS_S3_BUCKET,
  mediaConvertRole: process.env.MEDIACONVERT_ROLE,
  mediaConvertEndpoint: process.env.MEDIACONVERT_ENDPOINT,
  cloudFrontDomain: process.env.CLOUDFRONT_DOMAIN,
  cloudFrontKeyPairId: process.env.CLOUDFRONT_KEY_PAIR_ID,

  googleClientId: process.env.GOOGLE_CLIENT_ID,
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET,
  googleCallbackUrl: process.env.GOOGLE_CALLBACK_URL,

  facebookClientId: process.env.FACEBOOK_CLIENT_ID,
  facebookClientSecret: process.env.FACEBOOK_CLIENT_SECRET,
  facebookCallbackUrl: process.env.FACEBOOK_CALLBACK_URL,

  appleClientId: process.env.APPLE_CLIENT_ID,
  appleTeamId: process.env.APPLE_TEAM_ID,
  appleKeyId: process.env.APPLE_KEY_ID,
  applePrivateKey: process.env.APPLE_PRIVATE_KEY,
  appleCallbackUrl: process.env.APPLE_CALLBACK_URL,

  sessionSecret: process.env.SESSION_SECRET,
  redisUrl: process.env.REDIS_URL,
  freeCurrencyKey: process.env.FREECURRENCY_KEY,
  
  isProd: false,
};
