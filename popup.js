document.addEventListener('DOMContentLoaded', function() {
  chrome.storage.sync.get(['startRating', 'endRating', 'days', 'lastShownDate', 'completedProblems', 'streak'], function(data) {
    const today = new Date().toISOString().split('T')[0];
    const startRating = data.startRating || 1500;
    const endRating = data.endRating || 2000;
    const days = data.days || 5;
    const lastShownDate = data.lastShownDate || today;

    if (today !== lastShownDate) {
      const ratingIncrement = (endRating - startRating) / days;
      const currentDifficulty = startRating + ratingIncrement * ((new Date(today).getDate() - new Date(lastShownDate).getDate()) % days);
      chrome.storage.sync.set({ lastShownDate: today });
      fetchProblems(Math.round(currentDifficulty));
    } else {
      fetchProblems(startRating); // Fetch problems for today if same day
    }

    // Display streak info
    const streakInfo = document.getElementById('streakInfo');
    streakInfo.textContent = `Day ${data.streak || 1}`;
  });

  document.getElementById('fetch').addEventListener('click', function() {
    const startRating = parseInt(document.getElementById('startRating').value, 10);
    const endRating = parseInt(document.getElementById('endRating').value, 10);
    const days = parseInt(document.getElementById('days').value, 10);

    if (startRating && endRating && days) {
      chrome.storage.sync.set({ startRating, endRating, days, lastShownDate: new Date().toISOString().split('T')[0] });
      fetchProblems(startRating);
    } else {
      displayError('Please enter valid start rating, end rating, and number of days.');
    }
  });
});

function fetchProblems(difficulty) {
  const url = 'https://codeforces.com/api/problemset.problems';
  fetch(url)
    .then(response => response.json())
    .then(data => {
      if (data.status !== 'OK') {
        displayError('Failed to fetch problems');
        return;
      }

      const problems = data.result.problems;
      const problemStatistics = data.result.problemStatistics;

      const problemsWithStats = problems.map((problem, index) => {
        return { ...problem, solvedCount: problemStatistics[index].solvedCount };
      });

      const filteredProblems = problemsWithStats.filter(problem => problem.rating === difficulty);

      filteredProblems.sort((a, b) => b.solvedCount - a.solvedCount);

      const topProblems = filteredProblems.slice(0, 5);

      displayProblems(topProblems);
    })
    .catch(error => {
      displayError('Error fetching problems');
      console.error('Error:', error);
    });
}

function displayProblems(problems) {
  const problemsList = document.getElementById('problems');
  problemsList.innerHTML = '';
  problems.forEach(problem => {
    const li = document.createElement('li');
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = problem.contestId + problem.index;
    checkbox.dataset.problemId = problem.contestId + problem.index;

    const link = document.createElement('a');
    link.href = `https://codeforces.com/contest/${problem.contestId}/problem/${problem.index}`;
    link.target = '_blank';
    link.textContent = `${problem.contestId}-${problem.index}: ${problem.name} (Solved: ${problem.solvedCount})`;

    li.appendChild(checkbox);
    li.appendChild(link);
    problemsList.appendChild(li);

    // Load previously completed problems
    chrome.storage.sync.get('completedProblems', function(data) {
      if (data.completedProblems && data.completedProblems.includes(checkbox.dataset.problemId)) {
        checkbox.checked = true;
      }
    });

    // Handle checkbox changes
    checkbox.addEventListener('change', function() {
      chrome.storage.sync.get('completedProblems', function(data) {
        let completedProblems = data.completedProblems || [];
        if (checkbox.checked) {
          completedProblems.push(checkbox.dataset.problemId);
        } else {
          completedProblems = completedProblems.filter(id => id !== checkbox.dataset.problemId);
        }
        chrome.storage.sync.set({ completedProblems }, checkStreak);
      });
    });
  });
}

function displayError(message) {
  const problemsList = document.getElementById('problems');
  problemsList.innerHTML = `<li>${message}</li>`;
}

function checkStreak() {
  chrome.storage.sync.get(['completedProblems', 'days', 'streak'], function(data) {
    const problems = document.querySelectorAll('#problems input[type="checkbox"]');
    const allCompleted = Array.from(problems).every(checkbox => checkbox.checked);

    if (allCompleted) {
      const streak = (data.streak || 1) + 1;
      chrome.storage.sync.set({ streak });
      document.getElementById('streakInfo').textContent = `Day ${streak}`;
    }
  });
}
