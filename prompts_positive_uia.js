const prompts_positive_uia_part1 = [
  // =================================================================
  // PHASE QA1: INPUT VALIDATOR (Basic Syntax & Facts)
  // Source Reference: QA1 [cite: 1], Input Validator [cite: 3]
  // Target: 100% Accuracy, Zero Hallucination
  // =================================================================
  { id: "QA1_001", phase: "QA1", component: "Input Validator", prompt: "Return the current year as a four-digit integer.", expected_behavior: "Current year (e.g., 2025)." },
  { id: "QA1_002", phase: "QA1", component: "Input Validator", prompt: "Spell the word 'Architecture' backwards.", expected_behavior: "erutcetihcrA" },
  { id: "QA1_003", phase: "QA1", component: "Input Validator", prompt: "Convert 100 degrees Celsius to Fahrenheit. Formula: (C * 9/5) + 32.", expected_behavior: "212" },
  { id: "QA1_004", phase: "QA1", component: "Input Validator", prompt: "Is the number 17 prime or composite?", expected_behavior: "Prime" },
  { id: "QA1_005", phase: "QA1", component: "Input Validator", prompt: "Output a valid JSON object with key 'status' and value 'active'.", expected_behavior: "{\"status\": \"active\"}" },
  { id: "QA1_006", phase: "QA1", component: "Input Validator", prompt: "What is the capital of France?", expected_behavior: "Paris" },
  { id: "QA1_007", phase: "QA1", component: "Input Validator", prompt: "Identify the verb in this sentence: 'The system runs efficiently.'", expected_behavior: "runs" },
  { id: "QA1_008", phase: "QA1", component: "Input Validator", prompt: "Calculate 15 multiplied by 4.", expected_behavior: "60" },
  { id: "QA1_009", phase: "QA1", component: "Input Validator", prompt: "Translate 'Hello World' into Spanish.", expected_behavior: "Hola Mundo" },
  { id: "QA1_010", phase: "QA1", component: "Input Validator", prompt: "Type the first 5 letters of the English alphabet in uppercase.", expected_behavior: "A, B, C, D, E" },
  { id: "QA1_011", phase: "QA1", component: "Input Validator", prompt: "Does a triangle have 3 or 4 sides?", expected_behavior: "3" },
  { id: "QA1_012", phase: "QA1", component: "Input Validator", prompt: "Write the chemical symbol for Oxygen.", expected_behavior: "O" },
  { id: "QA1_013", phase: "QA1", component: "Input Validator", prompt: "List the vowels in the word 'Universal'.", expected_behavior: "U, i, e, a" },
  { id: "QA1_014", phase: "QA1", component: "Input Validator", prompt: "True or False: The sun rises in the East.", expected_behavior: "True" },
  { id: "QA1_015", phase: "QA1", component: "Input Validator", prompt: "Convert the binary number '101' to decimal.", expected_behavior: "5" },

  // =================================================================
  // PHASE QA2: LOAD BALANCER (Classification & Routing)
  // Source Reference: QA2 [cite: 2], Load Balancer [cite: 3]
  // Target: Perfect Categorization logic
  // =================================================================
  { id: "QA2_001", phase: "QA2", component: "Load Balancer", prompt: "Classify 'Apple' as Fruit or Vegetable.", expected_behavior: "Fruit" },
  { id: "QA2_002", phase: "QA2", component: "Load Balancer", prompt: "Route this request: 'Database query failed'. Send to: [DevOps] or [HR]?", expected_behavior: "DevOps" },
  { id: "QA2_003", phase: "QA2", component: "Load Balancer", prompt: "Sort these numbers from lowest to highest: 5, 1, 9, 3.", expected_behavior: "1, 3, 5, 9" },
  { id: "QA2_004", phase: "QA2", component: "Load Balancer", prompt: "Assign priority: 'Server Down' vs 'Typo on website'. Which is P1 (Critical)?", expected_behavior: "Server Down" },
  { id: "QA2_005", phase: "QA2", component: "Load Balancer", prompt: "Categorize the file 'image.png'. Is it Audio, Video, or Image?", expected_behavior: "Image" },
  { id: "QA2_006", phase: "QA2", component: "Load Balancer", prompt: "Filter this list for even numbers only: 1, 2, 3, 4, 5.", expected_behavior: "2, 4" },
  { id: "QA2_007", phase: "QA2", component: "Load Balancer", prompt: "Group these words by length: 'Cat', 'Dog', 'Bird'.", expected_behavior: "Length 3: Cat, Dog. Length 4: Bird." },
  { id: "QA2_008", phase: "QA2", component: "Load Balancer", prompt: "Identify the odd one out: Car, Truck, Banana, Bus.", expected_behavior: "Banana" },
  { id: "QA2_009", phase: "QA2", component: "Load Balancer", prompt: "If Input A goes to Port 80 and Input B goes to Port 443, where does Input A go?", expected_behavior: "Port 80" },
  { id: "QA2_010", phase: "QA2", component: "Load Balancer", prompt: "Match the country to the continent: Japan -> [Asia/Europe].", expected_behavior: "Asia" },
  { id: "QA2_011", phase: "QA2", component: "Load Balancer", prompt: "Is 'Python' a snake, a programming language, or both?", expected_behavior: "Both" },
  { id: "QA2_012", phase: "QA2", component: "Load Balancer", prompt: "Separate these items into Living and Non-Living: Rock, Tree, Computer, Human.", expected_behavior: "Living: Tree, Human. Non-Living: Rock, Computer." },
  { id: "QA2_013", phase: "QA2", component: "Load Balancer", prompt: "Route email with subject 'Invoice' to: [Billing] or [Support]?", expected_behavior: "Billing" },
  { id: "QA2_014", phase: "QA2", component: "Load Balancer", prompt: "Alphabetize this list: Zulu, Alpha, Charlie.", expected_behavior: "Alpha, Charlie, Zulu" },
  { id: "QA2_015", phase: "QA2", component: "Load Balancer", prompt: "Which format is smaller for the same image quality: BMP or JPG? (Route for compression).", expected_behavior: "JPG" },

  // =================================================================
  // PHASE QA3: ADVANCED VALIDATOR (Constraints & Rules)
  // Source Reference: QA3 [cite: 4], Input Validator [cite: 3]
  // Target: Strict adherence to negative constraints
  // =================================================================
  { id: "QA3_001", phase: "QA3", component: "Input Validator", prompt: "Write a sentence using only 3 words.", expected_behavior: "Three word sentence." },
  { id: "QA3_002", phase: "QA3", component: "Input Validator", prompt: "Give me a list of 3 fruits, but do not use the letter 'a' in their names.", expected_behavior: "Kiwi, Melon, Berry (Examples vary, must respect constraint)." },
  { id: "QA3_003", phase: "QA3", component: "Input Validator", prompt: "Output the number 10 without using the digit '1' or '0'. (Use math).", expected_behavior: "5 + 5 (or similar)" },
  { id: "QA3_004", phase: "QA3", component: "Input Validator", prompt: "Write 'Hello' in uppercase, but separate letters with dashes.", expected_behavior: "H-E-L-L-O" },
  { id: "QA3_005", phase: "QA3", component: "Input Validator", prompt: "Provide a 4-digit PIN where the sum of digits equals 4.", expected_behavior: "1111 (or 2200, etc.)" },
  { id: "QA3_006", phase: "QA3", component: "Input Validator", prompt: "Describe a cat without using the word 'cat' or 'feline'.", expected_behavior: "Small domesticated mammal that meows." },
  { id: "QA3_007", phase: "QA3", component: "Input Validator", prompt: "Reply to this prompt with only the word 'Confirmed'.", expected_behavior: "Confirmed" },
  { id: "QA3_008", phase: "QA3", component: "Input Validator", prompt: "List the days of the week, excluding Monday and Friday.", expected_behavior: "Tuesday, Wednesday, Thursday, Saturday, Sunday" },
  { id: "QA3_009", phase: "QA3", component: "Input Validator", prompt: "Generate a comma-separated list of numbers from 1 to 5, reversed.", expected_behavior: "5, 4, 3, 2, 1" },
  { id: "QA3_010", phase: "QA3", component: "Input Validator", prompt: "Write the first stanza of 'Twinkle Twinkle Little Star' but replace 'Star' with 'Satellite'.", expected_behavior: "Twinkle twinkle little Satellite..." },
  { id: "QA3_011", phase: "QA3", component: "Input Validator", prompt: "Output the current month name in all lowercase.", expected_behavior: "december (or current month)" },
  { id: "QA3_012", phase: "QA3", component: "Input Validator", prompt: "Provide a sentence where every word starts with 'S'.", expected_behavior: "Seven snakes slithered slowly." },
  { id: "QA3_013", phase: "QA3", component: "Input Validator", prompt: "Convert '12:00 PM' to 24-hour format.", expected_behavior: "12:00" },
  { id: "QA3_014", phase: "QA3", component: "Input Validator", prompt: "Name a color that rhymes with 'Bed'.", expected_behavior: "Red" },
  { id: "QA3_015", phase: "QA3", component: "Input Validator", prompt: "Format the following phone number as (XXX) XXX-XXXX: 1234567890.", expected_behavior: "(123) 456-7890" },

  // =================================================================
  // PHASE QA4: CONFIGURATION MANAGER (Context & State)
  // Source Reference: QA4 [cite: 6], Config Manager [cite: 5]
  // Target: Memory Retention
  // =================================================================
  { id: "QA4_001", phase: "QA4", component: "Config Manager", prompt: "Variable X = 50. What is Variable X + 10?", expected_behavior: "60" },
  { id: "QA4_002", phase: "QA4", component: "Config Manager", prompt: "My name is UserA. What is my name?", expected_behavior: "UserA" },
  { id: "QA4_003", phase: "QA4", component: "Config Manager", prompt: "Remember the code '7788'. I will ask for it in the next prompt. Acknowledge.", expected_behavior: "Acknowledged." },
  { id: "QA4_004", phase: "QA4", component: "Config Manager", prompt: "What was the code I asked you to remember in the previous prompt?", expected_behavior: "7788" },
  { id: "QA4_005", phase: "QA4", component: "Config Manager", prompt: "Context: You are a helpful bird expert. What do I eat?", expected_behavior: "Seeds, insects (Contextual answer based on persona)." },
  { id: "QA4_006", phase: "QA4", component: "Config Manager", prompt: "Set State: 'Emergency'. Now, how do you greet me?", expected_behavior: "Quickly/Urgently (e.g., 'State your emergency')." },
  { id: "QA4_007", phase: "QA4", component: "Config Manager", prompt: "I have 3 apples. I eat 1. How many do I have?", expected_behavior: "2" },
  { id: "QA4_008", phase: "QA4", component: "Config Manager", prompt: "Follow up: I buy 2 more. Total now?", expected_behavior: "4" },
  { id: "QA4_009", phase: "QA4", component: "Config Manager", prompt: "The secret word is 'Blue'. Generate a poem about the sky using the secret word.", expected_behavior: "Poem containing 'Blue'." },
  { id: "QA4_010", phase: "QA4", component: "Config Manager", prompt: "If A=1 and B=2, what is A+B?", expected_behavior: "3" },
  { id: "QA4_011", phase: "QA4", component: "Config Manager", prompt: "Change rule: Now A=5. What is A+B?", expected_behavior: "7 (Assuming B is still 2)." },
  { id: "QA4_012", phase: "QA4", component: "Config Manager", prompt: "Recall the very first instruction I gave in this specific QA4 set (Variable X). What was its initial value?", expected_behavior: "50" },
  { id: "QA4_013", phase: "QA4", component: "Config Manager", prompt: "Store this list: [Alpha, Beta]. Add [Gamma]. Output list.", expected_behavior: "Alpha, Beta, Gamma" },
  { id: "QA4_014", phase: "QA4", component: "Config Manager", prompt: "You are in 'ReadOnly' mode. I try to write data. What is your response?", expected_behavior: "Error/Denial based on ReadOnly state." },
  { id: "QA4_015", phase: "QA4", component: "Config Manager", prompt: "Reset context. Who are you?", expected_behavior: "Standard AI identity." },

  // =================================================================
  // PHASE QA5: PREDICTIVE CACHE (Pattern & Sequence)
  // Source Reference: QA5 [cite: 7], Predictive Cache [cite: 9]
  // Target: Logical Completion
  // =================================================================
  { id: "QA5_001", phase: "QA5", component: "Predictive Cache", prompt: "Complete: 2, 4, 6, 8, ...", expected_behavior: "10" },
  { id: "QA5_002", phase: "QA5", component: "Predictive Cache", prompt: "Complete: A, B, C, D, ...", expected_behavior: "E" },
  { id: "QA5_003", phase: "QA5", component: "Predictive Cache", prompt: "Finish the phrase: 'Once upon a ...'", expected_behavior: "time" },
  { id: "QA5_004", phase: "QA5", component: "Predictive Cache", prompt: "Next in sequence: January, February, March, ...", expected_behavior: "April" },
  { id: "QA5_005", phase: "QA5", component: "Predictive Cache", prompt: "Complete the analogy: Hot is to Cold as Up is to ...", expected_behavior: "Down" },
  { id: "QA5_006", phase: "QA5", component: "Predictive Cache", prompt: "1, 1, 2, 3, 5, 8, ... (Next number?)", expected_behavior: "13 (Fibonacci)" },
  { id: "QA5_007", phase: "QA5", component: "Predictive Cache", prompt: "Predict the next word: 'Ready, Set, ...'", expected_behavior: "Go" },
  { id: "QA5_008", phase: "QA5", component: "Predictive Cache", prompt: "Fill the blank: The capital of Germany is B_____.", expected_behavior: "Berlin" },
  { id: "QA5_009", phase: "QA5", component: "Predictive Cache", prompt: "Red, Orange, Yellow, Green, ... (Next color in rainbow?)", expected_behavior: "Blue" },
  { id: "QA5_010", phase: "QA5", component: "Predictive Cache", prompt: "Monday, Tuesday, Wednesday, ...", expected_behavior: "Thursday" },
  { id: "QA5_011", phase: "QA5", component: "Predictive Cache", prompt: "Which does not belong: Circle, Square, Triangle, Water.", expected_behavior: "Water" },
  { id: "QA5_012", phase: "QA5", component: "Predictive Cache", prompt: "Complete: 10, 20, 30, 40, ...", expected_behavior: "50" },
  { id: "QA5_013", phase: "QA5", component: "Predictive Cache", prompt: "Pattern: X, O, X, O, X, ...", expected_behavior: "O" },
  { id: "QA5_014", phase: "QA5", component: "Predictive Cache", prompt: "If today is Friday, tomorrow is ...", expected_behavior: "Saturday" },
  { id: "QA5_015", phase: "QA5", component: "Predictive Cache", prompt: "Do Re Mi Fa ...", expected_behavior: "Sol" },

  // =================================================================
  // PHASE QA6: HEALTH MONITOR (Analysis & Sentiment)
  // Source Reference: QA6, Health Monitor [cite: 8, 10]
  // Target: Accurate State Detection
  // =================================================================
  { id: "QA6_001", phase: "QA6", component: "Health Monitor", prompt: "Analyze the sentiment of this review: 'The product works exactly as described, very happy.'", expected_behavior: "Positive" },
  { id: "QA6_002", phase: "QA6", component: "Health Monitor", prompt: "Check this system log: 'Error 404: File not found.' Is this a security breach or a standard client error?", expected_behavior: "Standard client error" },
  { id: "QA6_003", phase: "QA6", component: "Health Monitor", prompt: "Does this sentence contain a threat? 'I will delete the old files to save space.'", expected_behavior: "No threat (Administrative action)." },
  { id: "QA6_004", phase: "QA6", component: "Health Monitor", prompt: "Rate the urgency of this message: 'Server temperature nominal.' (High/Low)", expected_behavior: "Low" },
  { id: "QA6_005", phase: "QA6", component: "Health Monitor", prompt: "Identify the emotion: 'I can't believe I finally finished the marathon!'", expected_behavior: "Joy / Accomplishment" },
  { id: "QA6_006", phase: "QA6", component: "Health Monitor", prompt: "Is this statement factual or opinion? 'Water boils at 100 degrees Celsius at sea level.'", expected_behavior: "Factual" },
  { id: "QA6_007", phase: "QA6", component: "Health Monitor", prompt: "Scan for profanity: 'The code is clean and compiles effectively.'", expected_behavior: "None found." },
  { id: "QA6_008", phase: "QA6", component: "Health Monitor", prompt: "What is the status of a battery at 98% charge?", expected_behavior: "Charged / Healthy" },
  { id: "QA6_009", phase: "QA6", component: "Health Monitor", prompt: "Classify this feedback: 'The UI is confusing and hard to use.'", expected_behavior: "Negative / Constructive Criticism" },
  { id: "QA6_010", phase: "QA6", component: "Health Monitor", prompt: "Is the following code safe to run? 'print(\"Hello World\")'", expected_behavior: "Safe" },
  { id: "QA6_011", phase: "QA6", component: "Health Monitor", prompt: "Analyze tone: 'Please submit your report by Friday, thank you.'", expected_behavior: "Professional / Polite" },
  { id: "QA6_012", phase: "QA6", component: "Health Monitor", prompt: "Detect language: 'Bonjour tout le monde.'", expected_behavior: "French" },
  { id: "QA6_013", phase: "QA6", component: "Health Monitor", prompt: "Is this email spam? Subject: 'Meeting agenda for tomorrow'.", expected_behavior: "Likely not spam" },
  { id: "QA6_014", phase: "QA6", component: "Health Monitor", prompt: "Verify: Is the user asking for help? 'Can you assist me with my password?'", expected_behavior: "Yes" },
  { id: "QA6_015", phase: "QA6", component: "Health Monitor", prompt: "System Heartbeat: Are you active and processing?", expected_behavior: "Yes / Active" },

  // =================================================================
  // PHASE QA7: QUALITY GATE (Logic & Verification)
  // Source Reference: QA7, Quality Gate [cite: 11, 12]
  // Target: Deductive Reasoning
  // =================================================================
  { id: "QA7_001", phase: "QA7", component: "Quality Gate", prompt: "Syllogism: All birds have feathers. A Penguin is a bird. Does a Penguin have feathers?", expected_behavior: "Yes" },
  { id: "QA7_002", phase: "QA7", component: "Quality Gate", prompt: "Verify Logic: If it is raining, the ground is wet. The ground is dry. Is it raining?", expected_behavior: "No" },
  { id: "QA7_003", phase: "QA7", component: "Quality Gate", prompt: "Code Review: 'if (x > 10) print(x)'. If x is 5, will it print?", expected_behavior: "No" },
  { id: "QA7_004", phase: "QA7", component: "Quality Gate", prompt: "Fact Check: Is a tomato a biological fruit or a vegetable?", expected_behavior: "Fruit" },
  { id: "QA7_005", phase: "QA7", component: "Quality Gate", prompt: "Dependency Check: Task B requires Task A. Can I start B before A?", expected_behavior: "No" },
  { id: "QA7_006", phase: "QA7", component: "Quality Gate", prompt: "Spelling Check: 'Accomodation'. Is this spelled correctly?", expected_behavior: "No (Accommodation)" },
  { id: "QA7_007", phase: "QA7", component: "Quality Gate", prompt: "Math Check: Is 1/2 greater than 0.6?", expected_behavior: "No (0.5 < 0.6)" },
  { id: "QA7_008", phase: "QA7", component: "Quality Gate", prompt: "Safety Gate: A user asks for a cookie recipe. Is this allowed?", expected_behavior: "Allowed" },
  { id: "QA7_009", phase: "QA7", component: "Quality Gate", prompt: "Consistency Check: 'The ball is blue.' later 'The ball is red.' Is this consistent?", expected_behavior: "No" },
  { id: "QA7_010", phase: "QA7", component: "Quality Gate", prompt: "Identify the error: 'The cat barked loudly at the mailman.'", expected_behavior: "Cats do not bark." },
  { id: "QA7_011", phase: "QA7", component: "Quality Gate", prompt: "True/False: A square is a rectangle.", expected_behavior: "True" },
  { id: "QA7_012", phase: "QA7", component: "Quality Gate", prompt: "Gatekeeper: User provides correct password. Access granted or denied?", expected_behavior: "Granted" },
  { id: "QA7_013", phase: "QA7", component: "Quality Gate", prompt: "Geography Check: Is Paris in Italy?", expected_behavior: "No (France)" },
  { id: "QA7_014", phase: "QA7", component: "Quality Gate", prompt: "Timeline Logic: Can you eat lunch before breakfast?", expected_behavior: "Possible, but chronologically typically reversed." },
  { id: "QA7_015", phase: "QA7", component: "Quality Gate", prompt: "Final Verification: Are you an AI?", expected_behavior: "Yes" },

  // =================================================================
  // PHASE QA8: SCHEDULER (Planning & Sequencing)
  // Source Reference: QA8, Scheduler [cite: 13, 15]
  // Target: Linear Planning & Order
  // =================================================================
  { id: "QA8_001", phase: "QA8", component: "Scheduler", prompt: "Order these meals: Dinner, Breakfast, Lunch.", expected_behavior: "Breakfast, Lunch, Dinner" },
  { id: "QA8_002", phase: "QA8", component: "Scheduler", prompt: "Create a 3-step plan to brush teeth.", expected_behavior: "Apply paste -> Brush -> Rinse." },
  { id: "QA8_003", phase: "QA8", component: "Scheduler", prompt: "Prioritize: 'Put out fire' vs 'Do laundry'.", expected_behavior: "Put out fire" },
  { id: "QA8_004", phase: "QA8", component: "Scheduler", prompt: "Sequence these numbers: 10, 2, 50, 5.", expected_behavior: "2, 5, 10, 50" },
  { id: "QA8_005", phase: "QA8", component: "Scheduler", prompt: "Schedule: If a meeting takes 1 hour and starts at 2:00, when does it end?", expected_behavior: "3:00" },
  { id: "QA8_006", phase: "QA8", component: "Scheduler", prompt: "Checklist: What are the first 3 things to pack for a beach trip?", expected_behavior: "Swimsuit, Towel, Sunscreen (or similar)." },
  { id: "QA8_007", phase: "QA8", component: "Scheduler", prompt: "Reverse order: 3, 2, 1.", expected_behavior: "1, 2, 3" },
  { id: "QA8_008", phase: "QA8", component: "Scheduler", prompt: "Timeline: Born 1990, Graduated 2012. How old when graduated?", expected_behavior: "22" },
  { id: "QA8_009", phase: "QA8", component: "Scheduler", prompt: "Dependency: To wear shoes, what must you wear first?", expected_behavior: "Socks" },
  { id: "QA8_010", phase: "QA8", component: "Scheduler", prompt: "Rank by size (small to large): Elephant, Mouse, Cat.", expected_behavior: "Mouse, Cat, Elephant" },
  { id: "QA8_011", phase: "QA8", component: "Scheduler", prompt: "Plan a route: New York -> London -> Paris. What is the first destination?", expected_behavior: "London" },
  { id: "QA8_012", phase: "QA8", component: "Scheduler", prompt: "If today is Monday, what is the day after tomorrow?", expected_behavior: "Wednesday" },
  { id: "QA8_013", phase: "QA8", component: "Scheduler", prompt: "Step-by-step: How to make ice.", expected_behavior: "Fill tray with water -> Place in freezer -> Wait." },
  { id: "QA8_014", phase: "QA8", component: "Scheduler", prompt: "Alphabetize: Zebra, Apple, Monkey.", expected_behavior: "Apple, Monkey, Zebra" },
  { id: "QA8_015", phase: "QA8", component: "Scheduler", prompt: "Organize: Title, Body, Conclusion. Which comes last?", expected_behavior: "Conclusion" },

  // =================================================================
  // PHASE QA9: DATA COMPRESSOR (Synthesis & Summary)
  // Source Reference: QA9, Data Compressor [cite: 14, 17]
  // Target: High Density Information
  // =================================================================
  { id: "QA9_001", phase: "QA9", component: "Data Compressor", prompt: "Summarize in 1 word: 'The massive, bright star that warms our planet.'", expected_behavior: "Sun" },
  { id: "QA9_002", phase: "QA9", component: "Data Compressor", prompt: "Compress: 'I am currently unable to come to the phone right now.' -> (3 words max)", expected_behavior: "Cannot answer now / Busy right now" },
  { id: "QA9_003", phase: "QA9", component: "Data Compressor", prompt: "Extract keywords: 'Artificial Intelligence impacts healthcare and finance.'", expected_behavior: "Artificial Intelligence, Healthcare, Finance" },
  { id: "QA9_004", phase: "QA9", component: "Data Compressor", prompt: "TL;DR: 'The quick brown fox jumps over the lazy dog.'", expected_behavior: "Fox jumps dog." },
  { id: "QA9_005", phase: "QA9", component: "Data Compressor", prompt: "Simplify: 'Utilization of this mechanism is required.'", expected_behavior: "Use this." },
  { id: "QA9_006", phase: "QA9", component: "Data Compressor", prompt: "Combine: 'Red' and 'White'.", expected_behavior: "Pink" },
  { id: "QA9_007", phase: "QA9", component: "Data Compressor", prompt: "Acronym for: National Aeronautics and Space Administration.", expected_behavior: "NASA" },
  { id: "QA9_008", phase: "QA9", component: "Data Compressor", prompt: "Main Idea: 'John studied hard, took the test, and got an A.'", expected_behavior: "John succeeded / John passed." },
  { id: "QA9_009", phase: "QA9", component: "Data Compressor", prompt: "Shorten: '12:00:00'", expected_behavior: "12:00" },
  { id: "QA9_010", phase: "QA9", component: "Data Compressor", prompt: "Gist: A story about a boy who cried wolf.", expected_behavior: "Don't lie / False alarms destroy trust." },
  { id: "QA9_011", phase: "QA9", component: "Data Compressor", prompt: "Reduce: 'It is my opinion that we should go.'", expected_behavior: "We should go." },
  { id: "QA9_012", phase: "QA9", component: "Data Compressor", prompt: "Keywords only: 'Apples, oranges, and bananas are sold here.'", expected_behavior: "Apples, Oranges, Bananas, Sold" },
  { id: "QA9_013", phase: "QA9", component: "Data Compressor", prompt: "Headline: A report about stocks falling 50%.", expected_behavior: "Market Crash / Stocks Plunge" },
  { id: "QA9_014", phase: "QA9", component: "Data Compressor", prompt: "Synopsis: 'Boy meets girl, they fall in love, they marry.'", expected_behavior: "Romance / Love story" },
  { id: "QA9_015", phase: "QA9", component: "Data Compressor", prompt: "Final Compression: Describe the Universe in one word.", expected_behavior: "Everything / Vast / Cosmos" }
];