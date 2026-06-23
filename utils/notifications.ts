export const sendPushNotification = async (
  targetToken: string,
  title: string,
  body: string,
  data: any = {}
) => {
  try {
    const message = {
      to: targetToken,
      sound: 'default',
      title,
      body,
      data,
    };

    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });

    return response.json();
  } catch (error) {
    console.error('Error sending push notification:', error);
  }
};
