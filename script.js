// ========================================================================
// 歌詞資料庫（動態載入）
// ========================================================================
let lyricsDatabase = null;
let cheatCodes = null;
let dataLoadingPromise = null;

// 載入歌詞資料
async function loadLyricsData() {
  // 如果已經載入過，直接返回
  if (lyricsDatabase && cheatCodes) {
    return { lyricsDatabase, cheatCodes };
  }
  
  // 如果正在載入，等待載入完成
  if (dataLoadingPromise) {
    return await dataLoadingPromise;
  }
  
  // 開始載入
  dataLoadingPromise = fetch('lyrics.json')
    .then(response => {
      if (!response.ok) {
        throw new Error('無法載入歌詞資料');
      }
      return response.json();
    })
    .then(data => {
      lyricsDatabase = data.lyricsDatabase;
      cheatCodes = data.cheatCodes;
      return { lyricsDatabase, cheatCodes };
    })
    .catch(error => {
      dataLoadingPromise = null; // 重置，允許重試
      throw error;
    });
  
  return await dataLoadingPromise;
}

// 舊的資料結構已移除，改為從 JSON 載入
// cheatCodes 已移除，改為從 JSON 載入

// ========================================================================
// 事件監聽
// ========================================================================
document.addEventListener('DOMContentLoaded', () => {
  const searchButton = document.getElementById('search-button');
  const songTitlesTextarea = document.getElementById('song-titles'); // 取得輸入框

  if (searchButton) {
    searchButton.addEventListener('click', handleSearch);
  }
  // ↓↓↓ 新增：監聽輸入框的輸入事件，以觸發密技 ↓↓↓
  if (songTitlesTextarea) {
    songTitlesTextarea.addEventListener('input', handleCheatCodeInput);
  }

  // ↓↓↓ 新增：檢查 URL 查詢字串並自動搜尋 ↓↓↓
  checkUrlQueryAndSearch();
});

// ========================================================================
// URL 查詢字串處理
// ========================================================================
async function checkUrlQueryAndSearch() {
  const urlParams = new URLSearchParams(window.location.search);
  const query = urlParams.get('q') || urlParams.get('query') || urlParams.get('search');
  
  if (query) {
    const songTitlesTextarea = document.getElementById('song-titles');
    if (songTitlesTextarea) {
      // 解碼 URL 編碼的字串（例如 %E5%8B%87%E6%82%8D%E8%A1%8C 會變成 勇悍行）
      const decodedQuery = decodeURIComponent(query);
      // 將查詢字串填入輸入框
      songTitlesTextarea.value = decodedQuery;
      // 自動觸發搜尋
      await handleSearch();
    }
  }
}


async function handleCheatCodeInput(event) {
  const currentText = event.target.value.trim();
  
  // 確保資料已載入
  await loadLyricsData();
  
  // 檢查當前輸入的文字是否匹配某個密技
  if (cheatCodes[currentText]) {
    const playlist = cheatCodes[currentText];
    const playlistText = playlist.join('\n');
    
    // 替換輸入框的內容
    event.target.value = playlistText;

    // 提供一個小小的視覺回饋，讓使用者知道觸發成功
    event.target.classList.add('cheat-code-activated');
    setTimeout(() => {
      event.target.classList.remove('cheat-code-activated');
    }, 300); // 0.3秒後移除效果
  }
}


async function searchLyricsLocal(songTitlesString) {
  if (!songTitlesString || songTitlesString.trim() === '') { return [{ title: '錯誤', lyrics: '請輸入歌曲名稱。', error: true }]; }
  
  // 確保資料已載入
  await loadLyricsData();
  
  const songTitles = songTitlesString.split('\n').filter(title => title.trim() !== '');
  const results = [];
  const songs = lyricsDatabase.songs;
  const allDbTitles = Object.keys(songs);
  songTitles.forEach(title => {
    const trimmedTitle = title.trim();
    if (songs[trimmedTitle]) { results.push({ title: trimmedTitle, lyrics: songs[trimmedTitle] }); return; }
    const fuzzyMatches = allDbTitles.filter(dbTitle => dbTitle.includes(trimmedTitle));
    if (fuzzyMatches.length === 1) { const matchedTitle = fuzzyMatches[0]; results.push({ title: matchedTitle, lyrics: songs[matchedTitle] }); } 
    else if (fuzzyMatches.length > 1) { results.push({ title: trimmedTitle, choices: fuzzyMatches, disambiguation: true }); }
    else { results.push({ title: trimmedTitle, lyrics: `抱歉，資料庫中暫未收錄 "${trimmedTitle}" 的歌詞。`, error: true }); }
  });
  return results;
}
async function handleSearch() {
  const searchButton = document.getElementById('search-button');
  const loadingIndicator = document.getElementById('loading');
  const resultsContainer = document.getElementById('results-container');
  resultsContainer.style.display = 'none';
  loadingIndicator.style.display = 'flex';
  searchButton.disabled = true;
  const songTitles = document.getElementById('song-titles').value;
  
  try {
    // 確保資料已載入
    await loadLyricsData();
    const results = await searchLyricsLocal(songTitles);
    updateResults(results);
  } catch (error) {
    onFailure(error);
  } finally {
    loadingIndicator.style.display = 'none';
    searchButton.disabled = false;
  }
}
function updateResults(results) {
  const resultsContainer = document.getElementById('results-container');
  resultsContainer.innerHTML = '';
  results.forEach(result => {
    const resultDiv = document.createElement('div');
    resultDiv.className = 'song-result';
    if (result.disambiguation) {
      let choicesHtml = `<h3>您想找的是不是 "${result.title}" 的其中一首？</h3><div class="choice-buttons">`;
      result.choices.forEach(choice => { choicesHtml += `<button class="choice-button" onclick="handleChoiceClick('${result.title}', '${choice}')">${choice}</button>`; });
      choicesHtml += '</div>';
      resultDiv.innerHTML = choicesHtml;
    } else if (result.lyrics && !result.error) {
      const title = document.createElement('h3');
      title.textContent = result.title;
      const lyrics = document.createElement('pre');
      lyrics.textContent = result.lyrics;
      resultDiv.appendChild(title);
      resultDiv.appendChild(lyrics);
    } else {
      resultDiv.classList.add('error');
      resultDiv.innerHTML = `<h3>查無結果</h3><pre class="error-message">${result.lyrics}</pre>`;
    }
    resultsContainer.appendChild(resultDiv);
  });
  const searchButton = document.getElementById('search-button');
  const loadingIndicator = document.getElementById('loading');
  loadingIndicator.style.display = 'none';
  resultsContainer.style.display = 'block';
  searchButton.disabled = false;
}
function handleChoiceClick(originalTitle, chosenTitle) {
  const textarea = document.getElementById('song-titles');
  const currentTitles = textarea.value.split('\n');
  const newTitles = currentTitles.map(line => {
    if (line.trim() === originalTitle) { return chosenTitle; }
    return line;
  });
  textarea.value = newTitles.join('\n');
  handleSearch();
}
function onFailure(error) {
  const resultsContainer = document.getElementById('results-container');
  resultsContainer.innerHTML = `<div class="song-result error"><h3>發生錯誤</h3><pre class="error-message">${error.message}</pre></div>`;
  const searchButton = document.getElementById('search-button');
  const loadingIndicator = document.getElementById('loading');
  loadingIndicator.style.display = 'none';
  resultsContainer.style.display = 'block';
  searchButton.disabled = false;
}