import { QuestionType } from "../constants";

export const onboardingData = [
  {
    name: 'Individual Therapy',
    order: 1,
    description: 'For individuals seeking one-on-one support to manage personal challenges and improve mental well-being.',
    questions: [
      { text: 'Which country/region are you in?', type: QuestionType.SINGLE, option: ['Addis Ababa', 'Oromia', 'Tigray', 'Amhara', 'Other'] },
      { text: 'What is your age?', type: QuestionType.SINGLE, option: ['18–24', '25–34', '35–44', '45–54', '55+'] },
      // { text: 'What gender do you identify with?', type: QuestionType.SINGLE, option: ['Male', 'Female'] },
      { text: 'What is your relationship status?', type: QuestionType.SINGLE, option: ['single', 'In a relationship', 'Married', 'Divorced', 'Widowed'] },
      { text: 'How did you hear about us?', type: QuestionType.SINGLE, option: ['Tiktok', 'Instagram', 'LinkedIn', 'Telegram', 'Facebook', 'YouTube', 'Referred by a friend', 'Online search', 'Therapist referral', 'Other'] },
      { text: 'What brings you to therapy today?', type: QuestionType.MULTIPLE, option: ['Anxiety', 'Depression', 'Stress', 'Trauma', 'Grief/Loss', 'Relationship problems', 'Self-esteem', 'Anger issues', 'Other'] },
      { text: 'How long have you been experiencing this issue?', type: QuestionType.SINGLE, option: ['Less than 3 months', '3–6 months', '6 months – 1 year', 'Over 1 year'] },
      { text: 'How would you describe your sleep?', type: QuestionType.SINGLE, option: ['I sleep well', 'Trouble falling asleep', 'Trouble staying asleep', 'Sleep too much', 'Not sure'] },
      { text: 'Have you attended therapy before?', type: QuestionType.SINGLE, option: ['Yes', 'No'] },
      // { text: 'What is your main goal for therapy?', type: QuestionType.OPEN, option: [] },
      // { text: 'Therapist experience level?', type: QuestionType.SINGLE, option: ['associate – 580 ETB', 'moderate – 700 ETB', 'advanced – 800 ETB'] },
      // { text: 'Preferred therapist gender:', type: QuestionType.SINGLE, option: ['Male', 'Female', 'No preference'] },
      // { text: 'Preferred language for sessions:', type: QuestionType.SINGLE, option: ['Amharic', 'English', 'Oromo', 'Tigrigna', 'Other'] },
      // { text: 'Preferred session format:', type: QuestionType.SINGLE, option: ['Video Call', 'Phone Call', 'Chat/Text'] },
      // { text: 'What times are you available for sessions?', type: QuestionType.SINGLE, option: ['Weekday Mornings', 'Weekend Mornings', 'Weekday Afternoon', 'Weekend Afternoon', 'Weekday Evening', 'Weekend Evening'] }
    ]
  },

  {      
    name: 'Teen Therapy',
    order: 2,
    description: 'For teens or guardians seeking support for adolescent mental health and development.',
    questions: [
      { text: 'Who is filling this out?', type: QuestionType.SINGLE, option: ['Teen', 'Parent/Guardian (on behalf of teen)'] },
      { text: 'What is the teen’s age?', type: QuestionType.SINGLE, option: ['13', '14', '15', '16', '17', '18'] },
      // { text: 'Teen’s gender:', type: QuestionType.SINGLE, option: ['Male', 'Female'] },
      { text: 'Which country/region are you in?', type: QuestionType.SINGLE, option: ['Addis Ababa', 'Oromia', 'Tigray', 'Amhara', 'Other'] },
      { text: 'How did you hear about us?', type: QuestionType.SINGLE, option: ['Tiktok', 'Instagram', 'LinkedIn', 'Telegram', 'Facebook', 'YouTube', 'Referred by a school or parent', 'Online search', 'Therapist referral', 'Other'] },
      { text: 'Main concerns', type: QuestionType.MULTIPLE, option: ['Anxiety', 'Depression', 'Peer pressure', 'Trauma', 'Self-esteem/confidence issue', 'Academic stress', 'Family issues', 'Behavioral change', 'Bullying', 'Social isolation', 'Other'] },
      { text: 'Duration of the issue:', type: QuestionType.SINGLE, option: ['Less than 3 months', '3–6 months', '6–12 months', 'Over 1 year'] },
      { text: 'How is the teen’s sleep?', type: QuestionType.SINGLE, option: ['Sleeps well', 'Can’t fall asleep', 'Wakes up often', 'Sleeps too much', 'Unknown'] },
      { text: 'Has the teen been in therapy before?', type: QuestionType.SINGLE, option: ['Yes', 'No'] },
      // { text: 'What is the goal for therapy?', type: QuestionType.OPEN, option: [] },
      // { text: 'Preferred therapist experience level:', type: QuestionType.SINGLE, option: ['associate – 580 ETB', 'moderate – 700 ETB', 'advanced – 800 ETB'] },
      // { text: 'Preferred therapist gender:', type: QuestionType.SINGLE, option: ['Male', 'Female', 'No preference'] },
      // { text: 'Preferred language:', type: QuestionType.SINGLE, option: ['Amharic', 'English', 'Oromo', 'Other'] },
      // { text: 'Preferred session type:', type: QuestionType.SINGLE, option: ['Video Call', 'Phone Call', 'Chat/Text'] },
      // { text: 'Best times for sessions:', type: QuestionType.SINGLE, option: ['Weekday Mornings', 'Weekend Mornings', 'Weekday Afternoon', 'Weekend Afternoon', 'Weekday Evening', 'Weekend Evening'] }
    ]
  },

  {
    name: 'Couple Therapy',
    order: 3,
    description: 'For couples, including married partners, looking to improve communication, resolve conflicts, and grow together in their relationship.',
    questions: [
      { text: 'Which country/region are you in?', type: QuestionType.SINGLE, option: ['Addis Ababa', 'Oromia', 'Tigray', 'Amhara', 'Other'] },
      { text: 'What are your ages?', type: QuestionType.SINGLE, option: ['18–24', '25–34', '35–44', '45–54', '55+'] },
      { text: 'Genders:', type: QuestionType.SINGLE, option: ['Male', 'Female'] },
      { text: 'Relationship status:', type: QuestionType.SINGLE, option: ['Married', 'In a committed relationship', 'Engaged', 'Dating', 'Other'] },
      { text: 'How did you hear about us?', type: QuestionType.SINGLE, option: ['Tiktok', 'Instagram', 'LinkedIn', 'Telegram', 'Facebook', 'YouTube', 'Friend or family referral', 'Online search', 'Therapist referral', 'Other'] },
      { text: 'How long have you been together?', type: QuestionType.SINGLE, option: ['Less than 1 year', '1–3 years', '3–5 years', 'More than 5 years'] },
      { text: 'What are your main reasons for seeking couples therapy?', type: QuestionType.MULTIPLE, option: ['Communication problems', 'Trust issues', 'Intimacy or sexual concerns', 'Parenting challenges', 'Conflict resolution', 'Other'] },
      { text: 'Have either of you been to therapy before?', type: QuestionType.SINGLE, option: ['Yes', 'No'] },
      // { text: 'What are your goals for therapy?', type: QuestionType.OPEN, option: [] },
      // { text: 'Preferred therapist gender:', type: QuestionType.SINGLE, option: ['Male', 'Female', 'No preference'] },
      // { text: 'Preferred session format:', type: QuestionType.SINGLE, option: ['Video Call', 'Phone Call', 'Text Chat'] },
      // { text: 'What days and times work best for both of you?', type: QuestionType.SINGLE, option: ['Weekday Mornings', 'Weekend Mornings', 'Weekday Afternoon', 'Weekend Afternoon', 'Weekday Evening', 'Weekend Evening'] }
    ]
  },

  {
    name: 'Group Therapy',
    order: 4,
    description: 'For individuals looking to join a support group for shared experiences and healing.',
    questions: [
      { text: 'Which country/region are you in?', type: QuestionType.SINGLE, option: ['Addis Ababa', 'Oromia', 'Tigray', 'Amhara', 'Other'] },
      { text: 'What is your age?', type: QuestionType.SINGLE, option: ['18–24', '25–34', '35–44', '45–54', '55+'] },
      // { text: 'What gender do you identify with?', type: QuestionType.SINGLE, option: ['Male', 'Female'] },
      { text: 'How did you hear about us?', type: QuestionType.SINGLE, option: ['Tiktok', 'Instagram', 'LinkedIn', 'Telegram', 'Facebook', 'YouTube', 'Friend or family referral', 'Online search', 'Therapist referral', 'Other'] },
      { text: 'What type of group therapy are you interested in?', type: QuestionType.MULTIPLE, option: ['Anxiety support', 'Depression support', 'Stress management', 'Grief/loss support', 'Parenting support', 'Other'] },
      { text: 'Have you attended group therapy before?', type: QuestionType.SINGLE, option: ['Yes', 'No'] },
      { text: 'Are you comfortable sharing in a group setting?', type: QuestionType.SINGLE, option: ['Yes', 'No', 'Unsure'] },
      { text: 'What are your goals for joining group therapy?', type: QuestionType.OPEN, option: [] },
      // { text: 'Preferred session format:', type: QuestionType.SINGLE, option: ['Video Call', 'Phone Call'] },
      // { text: 'What days and times work best for you?', type: QuestionType.SINGLE, option: ['Weekday Mornings', 'Weekend Mornings', 'Weekday Afternoon', 'Weekend Afternoon', 'Weekday Evening', 'Weekend Evening'] }
    ]
  }
];