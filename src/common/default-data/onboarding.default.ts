export const onboardingData = [
  {
    name: 'Individual Therapy',
    description: 'For individuals seeking one-on-one support to manage personal challenges and improve mental well-being.',
    questions: [
      { text: 'Which country/region are you in?', type: 'single', option: ['Addis Ababa', 'Oromia', 'Tigray', 'Amhara', 'Other'] },
      { text: 'What is your age?', type: 'single', option: ['18–24', '25–34', '35–44', '45–54', '55+'] },
      { text: 'What gender do you identify with?', type: 'single', option: ['Male', 'Female'] },
      { text: 'What is your relationship status?', type: 'single', option: ['single', 'In a relationship', 'Married', 'Divorced', 'Widowed'] },
      { text: 'How did you hear about us?', type: 'single', option: ['Tiktok', 'Instagram', 'LinkedIn', 'Telegram', 'Facebook', 'YouTube', 'Referred by a friend', 'Online search', 'Therapist referral', 'Other'] },
      { text: 'What brings you to therapy today?', type: 'multiple', option: ['Anxiety', 'Depression', 'Stress', 'Trauma', 'Grief/Loss', 'Relationship problems', 'Self-esteem', 'Anger issues', 'Other'] },
      { text: 'How long have you been experiencing this issue?', type: 'single', option: ['Less than 3 months', '3–6 months', '6 months – 1 year', 'Over 1 year'] },
      { text: 'How would you describe your sleep?', type: 'single', option: ['I sleep well', 'Trouble falling asleep', 'Trouble staying asleep', 'Sleep too much', 'Not sure'] },
      { text: 'Have you attended therapy before?', type: 'single', option: ['Yes', 'No'] },
      { text: 'What is your main goal for therapy?', type: 'open', option: [] },
      { text: 'Therapist experience level?', type: 'single', option: ['associate – 580 ETB', 'moderate – 700 ETB', 'advanced – 800 ETB'] },
      { text: 'Preferred therapist gender:', type: 'single', option: ['Male', 'Female', 'No preference'] },
      { text: 'Preferred language for sessions:', type: 'single', option: ['Amharic', 'English', 'Oromo', 'Tigrigna', 'Other'] },
      { text: 'Preferred session format:', type: 'single', option: ['Video Call', 'Phone Call', 'Chat/Text'] },
      { text: 'What times are you available for sessions?', type: 'single', option: ['Weekday Mornings', 'Weekend Mornings', 'Weekday Afternoon', 'Weekend Afternoon', 'Weekday Evening', 'Weekend Evening'] }
    ]
  },

  {
    name: 'Teen Therapy',
    description: 'For teens or guardians seeking support for adolescent mental health and development.',
    questions: [
      { text: 'Who is filling this out?', type: 'single', option: ['Teen', 'Parent/Guardian (on behalf of teen)'] },
      { text: 'What is the teen’s age?', type: 'single', option: ['13', '14', '15', '16', '17', '18'] },
      { text: 'Teen’s gender:', type: 'single', option: ['Male', 'Female'] },
      { text: 'Which country/region do you live in?', type: 'single', option: ['Addis Ababa', 'Oromia', 'Amhara', 'Other'] },
      { text: 'How did you hear about us?', type: 'single', option: ['Tiktok', 'Instagram', 'LinkedIn', 'Telegram', 'Facebook', 'YouTube', 'Referred by a school or parent', 'Online search', 'Therapist referral', 'Other'] },
      { text: 'Main concerns', type: 'multiple', option: ['Anxiety', 'Depression', 'Peer pressure', 'Trauma', 'Self-esteem/confidence issue', 'Academic stress', 'Family issues', 'Behavioral change', 'Bullying', 'Social isolation', 'Other'] },
      { text: 'Duration of the issue:', type: 'single', option: ['Less than 3 months', '3–6 months', '6–12 months', 'Over 1 year'] },
      { text: 'How is the teen’s sleep?', type: 'single', option: ['Sleeps well', 'Can’t fall asleep', 'Wakes up often', 'Sleeps too much', 'Unknown'] },
      { text: 'Has the teen been in therapy before?', type: 'single', option: ['Yes', 'No'] },
      { text: 'What is the goal for therapy?', type: 'open', option: [] },
      { text: 'Preferred therapist experience level:', type: 'single', option: ['associate – 580 ETB', 'moderate – 700 ETB', 'advanced – 800 ETB'] },
      { text: 'Preferred therapist gender:', type: 'single', option: ['Male', 'Female', 'No preference'] },
      { text: 'Preferred language:', type: 'single', option: ['Amharic', 'English', 'Oromo', 'Other'] },
      { text: 'Preferred session type:', type: 'single', option: ['Video Call', 'Phone Call', 'Chat/Text'] },
      { text: 'Best times for sessions:', type: 'single', option: ['Weekday Mornings', 'Weekend Mornings', 'Weekday Afternoon', 'Weekend Afternoon', 'Weekday Evening', 'Weekend Evening'] }
    ]
  },

  {
    name: 'Couple Therapy',
    description: 'For couples looking to improve communication, resolve conflict, and grow together.',
    questions: [
      { text: 'Which country/region do you live in?', type: 'single', option: ['Addis Ababa', 'Oromia', 'Other'] },
      { text: 'What are your ages?', type: 'single', option: ['18–24', '25–34', '35–44', '45–54', '55+'] },
      { text: 'Genders:', type: 'single', option: ['Male', 'Female'] },
      { text: 'Relationship status:', type: 'single', option: ['Married', 'In a committed relationship', 'Engaged', 'Dating', 'Other'] },
      { text: 'How did you hear about us?', type: 'single', option: ['Tiktok', 'Instagram', 'LinkedIn', 'Telegram', 'Facebook', 'YouTube', 'Friend or family referral', 'Online search', 'Therapist referral', 'Other'] },
      { text: 'How long have you been together?', type: 'single', option: ['Less than 1 year', '1–3 years', '3–5 years', 'More than 5 years'] },
      { text: 'What are your main reasons for seeking couples therapy?', type: 'multiple', option: ['Communication problems', 'Trust issues', 'Intimacy or sexual concerns', 'Parenting challenges', 'Conflict resolution', 'Other'] },
      { text: 'Have either of you been to therapy before?', type: 'single', option: ['Yes', 'No'] },
      { text: 'What are your goals for therapy?', type: 'open', option: [] },
      { text: 'Preferred therapist gender:', type: 'single', option: ['Male', 'Female', 'No preference'] },
      { text: 'Preferred session format:', type: 'single', option: ['Video Call', 'Phone Call', 'Text Chat'] },
      { text: 'What days and times work best for both of you?', type: 'single', option: ['Weekday Mornings', 'Weekend Mornings', 'Weekday Afternoon', 'Weekend Afternoon', 'Weekday Evening', 'Weekend Evening'] }
    ]
  },

  {
    name: 'Group Therapy',
    description: 'For individuals looking to join a support group for shared experiences and healing.',
    questions: [
      { text: 'Which country/region do you live in?', type: 'single', option: ['Addis Ababa', 'Oromia', 'Other'] },
      { text: 'What is your age?', type: 'single', option: ['18–24', '25–34', '35–44', '45–54', '55+'] },
      { text: 'What gender do you identify with?', type: 'single', option: ['Male', 'Female'] },
      { text: 'How did you hear about us?', type: 'single', option: ['Tiktok', 'Instagram', 'LinkedIn', 'Telegram', 'Facebook', 'YouTube', 'Friend or family referral', 'Online search', 'Therapist referral', 'Other'] },
      { text: 'What type of group therapy are you interested in?', type: 'single', option: ['Anxiety support', 'Depression support', 'Stress management', 'Grief/loss support', 'Parenting support', 'Other'] },
      { text: 'Have you attended group therapy before?', type: 'single', option: ['Yes', 'No'] },
      { text: 'Are you comfortable sharing in a group setting?', type: 'single', option: ['Yes', 'No', 'Unsure'] },
      { text: 'What are your goals for joining group therapy?', type: 'open', option: [] },
      { text: 'Preferred session format:', type: 'single', option: ['Video Call', 'Phone Call'] },
      { text: 'What days and times work best for you?', type: 'single', option: ['Weekday Mornings', 'Weekend Mornings', 'Weekday Afternoon', 'Weekend Afternoon', 'Weekday Evening', 'Weekend Evening'] }
    ]
  }
];