// Game data structure with all categories and cards
const GAME_DATA = {
    categories: [
        {
            id: 1,
            name: "Movies",
            emoji: "🎬",
            cards: [
                "The Lion King", "Titanic", "Avatar", "Frozen", "Inception",
                "The Matrix", "Jurassic Park", "Star Wars", "Harry Potter",
                "The Avengers", "Toy Story", "Finding Nemo", "Shrek",
                "Spider-Man", "Batman", "Iron Man", "The Godfather",
                "Forrest Gump", "Pulp Fiction", "The Dark Knight",
                "Gladiator", "The Shawshank Redemption", "Fight Club",
                "The Lord of the Rings", "Pirates of the Caribbean",
                "Mission Impossible", "James Bond", "Terminator",
                "Back to the Future", "Indiana Jones", "E.T.",
                "Jaws", "Rocky", "Die Hard", "The Hunger Games",
                "Twilight", "The Fast and the Furious", "Transformers",
                "Minions", "Despicable Me", "Kung Fu Panda"
            ]
        },
        {
            id: 2,
            name: "Animals",
            emoji: "🦁",
            cards: [
                "Lion", "Tiger", "Elephant", "Giraffe", "Zebra",
                "Kangaroo", "Penguin", "Dolphin", "Shark", "Eagle",
                "Owl", "Parrot", "Peacock", "Flamingo", "Ostrich",
                "Crocodile", "Alligator", "Snake", "Frog", "Toad",
                "Bear", "Wolf", "Fox", "Rabbit", "Squirrel",
                "Deer", "Moose", "Buffalo", "Rhino", "Hippo",
                "Monkey", "Gorilla", "Chimpanzee", "Orangutan", "Panda",
                "Koala", "Sloth", "Raccoon", "Skunk", "Otter",
                "Seal", "Walrus", "Whale", "Octopus", "Jellyfish"
            ]
        },
        {
            id: 3,
            name: "Celebrities",
            emoji: "⭐",
            cards: [
                "Taylor Swift", "Beyoncé", "Rihanna", "Ariana Grande",
                "Justin Bieber", "Ed Sheeran", "Drake", "The Weeknd",
                "Leonardo DiCaprio", "Tom Cruise", "Brad Pitt",
                "Angelina Jolie", "Jennifer Lawrence", "Scarlett Johansson",
                "Chris Hemsworth", "Robert Downey Jr.", "Dwayne Johnson",
                "Will Smith", "Tom Hanks", "Morgan Freeman",
                "Oprah Winfrey", "Ellen DeGeneres", "Jimmy Fallon",
                "Cristiano Ronaldo", "Lionel Messi", "LeBron James",
                "Serena Williams", "Roger Federer", "Usain Bolt",
                "Elon Musk", "Bill Gates", "Mark Zuckerberg",
                "Jeff Bezos", "Barack Obama", "Donald Trump",
                "Kim Kardashian", "Kylie Jenner", "Kanye West",
                "Lady Gaga", "Adele", "Billie Eilish"
            ]
        },
        {
            id: 4,
            name: "Actions",
            emoji: "🎭",
            cards: [
                "Dancing", "Singing", "Swimming", "Running", "Jumping",
                "Cooking", "Eating", "Sleeping", "Reading", "Writing",
                "Painting", "Drawing", "Climbing", "Skiing", "Surfing",
                "Driving", "Flying", "Sailing", "Fishing", "Camping",
                "Gardening", "Shopping", "Laughing", "Crying", "Sneezing",
                "Yawning", "Clapping", "Waving", "Pointing", "Hugging",
                "Kissing", "Whispering", "Shouting", "Tiptoeing", "Jogging",
                "Stretching", "Meditating", "Praying", "Texting", "Typing",
                "Brushing teeth", "Combing hair", "Taking a selfie",
                "Playing guitar", "Playing piano"
            ]
        },
        {
            id: 5,
            name: "Food",
            emoji: "🍕",
            cards: [
                "Pizza", "Burger", "Pasta", "Sushi", "Tacos",
                "Ice Cream", "Chocolate", "Cookie", "Cake", "Donut",
                "Sandwich", "Hot Dog", "French Fries", "Chicken Wings",
                "Steak", "Salmon", "Shrimp", "Lobster", "Crab",
                "Salad", "Soup", "Ramen", "Fried Rice", "Burrito",
                "Nachos", "Guacamole", "Cheese", "Bacon", "Egg",
                "Pancake", "Waffle", "Muffin", "Croissant", "Bagel",
                "Popcorn", "Chips", "Pretzel", "Peanut Butter",
                "Honey", "Maple Syrup", "Ketchup", "Mustard", "Mayo"
            ]
        },
        {
            id: 6,
            name: "Sports",
            emoji: "⚽",
            cards: [
                "Football", "Basketball", "Baseball", "Tennis", "Golf",
                "Soccer", "Cricket", "Hockey", "Rugby", "Volleyball",
                "Swimming", "Boxing", "Wrestling", "Karate", "Judo",
                "Gymnastics", "Skateboarding", "Surfing", "Skiing", "Snowboarding",
                "Ice Skating", "Cycling", "Marathon", "Badminton", "Table Tennis",
                "Bowling", "Archery", "Fencing", "Rock Climbing", "Horseback Riding",
                "Polo", "Lacrosse", "Softball", "Ultimate Frisbee", "Dodgeball",
                "Water Polo", "Synchronized Swimming", "Diving", "Sailing", "Rowing"
            ]
        }
    ]
};

// Shuffle array utility
function shuffleArray(array) {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
}

// Get category by ID
function getCategoryById(id) {
    return GAME_DATA.categories.find(cat => cat.id === id);
}

// Get shuffled cards for a category
function getShuffledCards(categoryId) {
    const category = getCategoryById(categoryId);
    return category ? shuffleArray(category.cards) : [];
}
