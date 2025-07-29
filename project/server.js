const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Load menu items
const loadMenuItems = () => {
  try {
    const data = fs.readFileSync('master_menu_items.json', 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error loading menu items:', error);
    return [];
  }
};

// Helper function to check if popularity scores are within range
const isPopularityScoreClose = (score1, score2, tolerance = 0.2) => {
  return Math.abs(score1 - score2) <= tolerance;
};

// Helper function to find best matching items by popularity score
const findBestPopularityMatch = (items, targetScore) => {
  if (items.length === 0) return null;
  
  // Sort items by how close their popularity score is to the target
  const sortedItems = items.sort((a, b) => {
    const diffA = Math.abs(a.popularity_score - targetScore);
    const diffB = Math.abs(b.popularity_score - targetScore);
    return diffA - diffB;
  });
  
  return sortedItems[0];
};

// Helper function to find best matching items by calories
const findBestCalorieMatch = (combos, targetCalories, maxDifference = 200) => {
  return combos.filter(combo => {
    return combos.every(existingCombo => {
      const calorieDiff = Math.abs(combo.total_calories - existingCombo.total_calories);
      return calorieDiff < maxDifference;
    });
  });
};
// Helper function to calculate total calories for a combo
const calculateComboCalories = (combo) => {
  return combo.reduce((total, item) => total + item.calories, 0);
};

// Helper function to group items by taste profile and category
const groupItemsByTasteAndCategory = (items) => {
  const grouped = {};
  
  items.forEach(item => {
    if (!grouped[item.taste_profile]) {
      grouped[item.taste_profile] = {
        main: [],
        side: [],
        drink: []
      };
    }
    grouped[item.taste_profile][item.category].push(item);
  });
  
  return grouped;
};

// Helper function to find items with similar popularity scores
const findSimilarPopularityItems = (items, targetScore, tolerance = 0.2) => {
  return items.filter(item => isPopularityScoreClose(item.popularity_score, targetScore, tolerance));
};

// Generate combo for a specific taste profile
const generateComboForTaste = (groupedItems, tasteProfile, usedItems = new Set(), allowItemReuse = false) => {
  const tasteItems = groupedItems[tasteProfile];
  if (!tasteItems || !tasteItems.main.length || !tasteItems.side.length || !tasteItems.drink.length) {
    return null;
  }

  // Filter out used items only if not allowing reuse
  const availableMain = allowItemReuse ? tasteItems.main : tasteItems.main.filter(item => !usedItems.has(item.item_name));
  const availableSide = allowItemReuse ? tasteItems.side : tasteItems.side.filter(item => !usedItems.has(item.item_name));
  const availableDrink = allowItemReuse ? tasteItems.drink : tasteItems.drink.filter(item => !usedItems.has(item.item_name));

  if (!availableMain.length || !availableSide.length || !availableDrink.length) {
    return null;
  }

  // Find best matching items by popularity score
  for (let mainItem of availableMain) {
    const bestSide = findBestPopularityMatch(availableSide, mainItem.popularity_score);
    const bestDrink = findBestPopularityMatch(availableDrink, mainItem.popularity_score);

    if (bestSide && bestDrink) {
      return [mainItem, bestSide, bestDrink];
    }
  }

  return null;
};

// Generate combos for a single day
const generateDayCombos = (groupedItems, usedItemsForDay = new Set(), usedCombosGlobal = new Set(), allowItemReuse = false) => {
  const combos = [];
  const tasteProfiles = Object.keys(groupedItems);

  let attempts = 0;
  const maxAttempts = 100;

  while (combos.length < 3 && attempts < maxAttempts) {
    attempts++;
    
    // Try each taste profile
    for (let tasteProfile of tasteProfiles) {
      if (combos.length >= 3) break;

      const combo = generateComboForTaste(groupedItems, tasteProfile, usedItemsForDay, allowItemReuse);
      if (combo) {
        const comboKey = combo.map(item => item.item_name).sort().join('|');
        const comboCalories = calculateComboCalories(combo);
        
        if (!usedCombosGlobal.has(comboKey)) {
          // Check calorie difference with existing combos in the same day
          let calorieConflict = false;
          for (let existingCombo of combos) {
            const calorieDifference = Math.abs(comboCalories - existingCombo.total_calories);
            if (calorieDifference >= 200) {
              calorieConflict = true;
              break;
            }
          }
          
          if (!calorieConflict) {
            combos.push({
              combo_id: combos.length + 1,
              taste_profile: tasteProfile,
              items: combo,
              total_calories: comboCalories,
              average_popularity: (combo.reduce((sum, item) => sum + item.popularity_score, 0) / combo.length).toFixed(2)
            });
            
            // Mark items as used for this day (only if not allowing reuse)
            if (!allowItemReuse) {
              combo.forEach(item => usedItemsForDay.add(item.item_name));
            }
            usedCombosGlobal.add(comboKey);
          }
        }
      }
    }
  }

  return combos;
};

// Main recommendation function
const generateRecommendations = (startDay = 1) => {
  const menuItems = loadMenuItems();
  const groupedItems = groupItemsByTasteAndCategory(menuItems);
  
  const recommendations = [];
  const usedCombosGlobal = new Set();
  const usedItemsFirst3Days = new Set();
  
  for (let day = 0; day < 7; day++) {
    const currentDay = startDay + day;
    const isFirst3Days = day < 3;
    const usedItemsForDay = isFirst3Days ? usedItemsFirst3Days : new Set();
    const allowItemReuse = !isFirst3Days;
    
    const dayCombos = generateDayCombos(groupedItems, usedItemsForDay, usedCombosGlobal, allowItemReuse);
    
    if (dayCombos.length > 0) {
      const totalDayCalories = dayCombos.reduce((sum, combo) => sum + combo.total_calories, 0);
      
      recommendations.push({
        day: currentDay,
        total_day_calories: totalDayCalories,
        combos: dayCombos
      });
    }
  }

  // Try to balance calories across days
  const balancedRecommendations = balanceCaloriesAcrossDays(recommendations);
  
  return {
    success: true,
    message: "Menu recommendations generated successfully",
    data: {
      total_days: balancedRecommendations.length,
      total_combos: balancedRecommendations.reduce((sum, day) => sum + day.combos.length, 0),
      recommendations: balancedRecommendations
    }
  };
};

// Balance calories across days
const balanceCaloriesAcrossDays = (recommendations) => {
  if (recommendations.length < 2) return recommendations;

  // Calculate average daily calories
  const totalCalories = recommendations.reduce((sum, day) => sum + day.total_day_calories, 0);
  const avgCalories = totalCalories / recommendations.length;

  // Try to keep daily calories close to average
  recommendations.forEach(day => {
    const difference = Math.abs(day.total_day_calories - avgCalories);
    if (difference > 300) {
      console.log(`Day ${day.day} calories (${day.total_day_calories}) differ from average (${Math.round(avgCalories)}) by ${Math.round(difference)}`);
    }
  });

  return recommendations;
};

// API Routes
app.get('/api/recommendations', (req, res) => {
  try {
    const startDay = parseInt(req.query.day) || 1;
    const recommendations = generateRecommendations(startDay);
    res.json(recommendations);
  } catch (error) {
    console.error('Error generating recommendations:', error);
    res.status(500).json({
      success: false,
      message: "Error generating recommendations",
      error: error.message
    });
  }
});

// Get all menu items
app.get('/api/menu-items', (req, res) => {
  try {
    const menuItems = loadMenuItems();
    res.json({
      success: true,
      data: menuItems
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error loading menu items",
      error: error.message
    });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Menu Recommendation API is running' });
});

// Serve the frontend
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`AI Menu Recommendation API is running on http://localhost:${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
  console.log(`Recommendations: http://localhost:${PORT}/api/recommendations?day=1`);
});