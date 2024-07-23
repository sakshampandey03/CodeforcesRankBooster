chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.set({ startRating: 1500, endRating: 2000, days: 5, lastShownDate: new Date().toISOString().split('T')[0], completedProblems: [], streak: 1 });
});

chrome.runtime.onStartup.addListener(() => {
  chrome.storage.sync.get(['startRating', 'endRating', 'days', 'lastShownDate'], function(data) {
    const today = new Date().toISOString().split('T')[0];
    const startRating = data.startRating || 1500;
    const endRating = data.endRating || 2000;
    const days = data.days || 5;
    const lastShownDate = data.lastShownDate || today;

    if (today !== lastShownDate) {
      const ratingIncrement = (endRating - startRating) / days;
      const currentDifficulty = startRating + ratingIncrement * ((new Date(today).getDate() - new Date(lastShownDate).getDate()) % days);
      chrome.storage.sync.set({ lastShownDate: today });
    }
  });
});
