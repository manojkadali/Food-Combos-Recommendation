# 🍽️ AI Menu Recommendation Backend API

This project implements an AI-powered menu recommendation system using **Node.js + Express**. It recommends unique food combos based on a master menu file. The backend provides daily personalized food combos that satisfy specific constraints such as **taste profile**, **popularity**, and **caloric balance**.

---

## 📁 Project Structure

```
ai-menu-recommendation/
│
├── master_menu_items.json          # Master menu items file
├── doubled_menu_items.json         # Extended item list (generated)
├── index.js                        # Main Express.js API logic
├── utils/
│   └── comboGenerator.js           # Helper logic to create combos
├── public/
│   └── index.html                  # Basic frontend (no frameworks)
├── README.md                       # You're reading it
├── package.json
└── .gitignore
```

---

## 🚀 Features

- 📦 No database required, reads menu from a static JSON file
- 🍛 Recommends **3 unique combos per day** for **3 days** (total 9 combos)
- 🧂 Each combo has:
  - 1 Main dish
  - 1 Side dish
  - 1 Drink
- ✅ Items in a combo must share the same **taste profile**
- 📈 Popularity scores in a combo must be within **±0.2 range**
- 🔥 Calorie counts between days must differ by **±300**
- 🌐 Simple HTML frontend to trigger the API

---

## 📥 Installation

```bash
git clone https://github.com/your-username/ai-menu-recommendation.git
cd ai-menu-recommendation
npm install
```

---

## 🧪 Run Locally

```bash
node index.js
```

Visit [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🔁 API Endpoint

### `GET /recommendations?day=<day>`

Returns 3 food combos for the selected day.

- **Query Params:**
  - `day`: integer (1, 2, or 3)

#### ✅ Sample Response

```json
{
  "day": 2,
  "combos": [
    {
      "main": "Butter Chicken",
      "side": "Pakoras",
      "drink": "Buttermilk",
      "taste_profile": "savory",
      "total_calories": 780,
      "avg_popularity": 0.82
    }
  ]
}
```

---

## 🧠 Logic Constraints

- 3 combos per day, all combos contain unique items (no repeats within a day)
- Total of 9 combos across 3 days (combos are unique, but items can repeat)
- Same `taste_profile` within each combo
- Popularity scores of items in a combo differ by **≤ 0.2**
- Calories between days are balanced within **±300**

---

## 📄 License

MIT License. Feel free to use, modify, and share!

---

## 🤝 Contributions

PRs welcome. If you enhance the combo generation logic or improve efficiency, open a PR!

---

## 📬 Contact

Author: **Kadali Manoj**  
Email: [kadalimanojadg@gmail.com](mailto:kadalimanojadg@gmail.com)
