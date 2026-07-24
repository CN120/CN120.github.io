const season = new Date().getFullYear();
const teamId = new URLSearchParams(window.location.search).get('id');
const $ = (selector) => document.querySelector(selector);
const dateFormat = (date, options) => new Intl.DateTimeFormat('en-US', options).format(new Date(date));

const calendarDaysUntil = (date) => {
  const today = new Date();
  const gameDay = new Date(date);
  const asUtcDate = (value) => Date.UTC(value.getFullYear(), value.getMonth(), value.getDate());
  return Math.max(0, Math.round((asUtcDate(gameDay) - asUtcDate(today)) / 86400000));
};

function teamLogo(team) {
  return team.logo || team.logos?.find((logo) => logo.rel?.includes('default'))?.href || team.logos?.[0]?.href || '';
}

function gameLocation(game) {
  return [game.venue.address?.city, game.venue.address?.state].filter(Boolean).join(', ');
}

function kickoffTime(game) {
  return dateFormat(game.date, { hour: 'numeric', minute: '2-digit' });
}

function setTeamTheme(team) {
  const color = /^[0-9a-f]{6}$/i.test(team.color || '') ? `#${team.color}` : '#262626';
  const hex = color.slice(1);
  const red = parseInt(hex.slice(0, 2), 16);
  const green = parseInt(hex.slice(2, 4), 16);
  const blue = parseInt(hex.slice(4, 6), 16);
  const luminance = (0.2126 * red + 0.7152 * green + 0.0722 * blue) / 255;

  document.documentElement.style.setProperty('--primaryColor', color);
  document.documentElement.style.setProperty('--team-contrast', luminance > 0.62 ? '#181818' : '#ffffff');
}

function setTeamIdentity(team) {
  const logo = teamLogo(team);
  const teamName = team.displayName || `${team.location} ${team.name}`;
  const rally = team.name || teamName;

  setTeamTheme(team);
  document.title = `${teamName} Football — ${season} Schedule`;
  $('#team-name').textContent = teamName.toUpperCase();
  $('#team-rally').textContent = `GO ${rally.toUpperCase()}`;
  $('#schedule').setAttribute('aria-label', `${teamName} football schedule`);

  if (logo) {
    $('#team-logo').src = logo;
    $('#team-logo').alt = `${teamName} logo`;
    $('#team-logo').hidden = false;
  }
}

function formatGame(event) {
  const competition = event.competitions?.[0];
  const selectedTeam = competition?.competitors?.find(({ team }) => team.id === teamId);
  const opponent = competition?.competitors?.find((competitor) => competitor !== selectedTeam);
  if (!competition || !selectedTeam || !opponent) return null;

  return {
    date: event.date,
    day: dateFormat(event.date, { day: 'numeric' }),
    month: dateFormat(event.date, { month: 'short' }).toUpperCase(),
    weekday: dateFormat(event.date, { weekday: 'long' }).toUpperCase(),
    home: selectedTeam.homeAway === 'home',
    finished: competition.status?.type?.completed,
    selectedTeam,
    opponent,
    venue: competition.venue || {},
    network: competition.broadcasts?.find(({ type }) => type?.shortName === 'TV')?.media?.shortName || 'TV TBD'
  };
}

function result(game) {
  if (!game.finished) return kickoffTime(game);
  const won = Number(game.selectedTeam.score) > Number(game.opponent.score);
  return `<span class="${won ? 'win' : ''}">${won ? 'W' : 'L'} ${game.selectedTeam.score}–${game.opponent.score}</span>`;
}

function showState(title, detail, label = 'SCHEDULE STATUS') {
  $('#season').textContent = season;
  $('#next-month').textContent = 'ESPN'; $('#next-day').textContent = '—'; $('#next-weekday').textContent = label;
  $('#next-context').textContent = 'COLLEGE FOOTBALL'; $('#next-opponent').textContent = title;
  $('#next-details').textContent = detail;
  $('#count-number').textContent = '—'; $('#count-label').textContent = 'STATUS';
  $('#record').textContent = label;
  $('#games').innerHTML = `<div class="empty-state">${detail}</div>`;
  $('#updated').textContent = 'ESPN SCHEDULE DATA';
}

function render(games) {
  const next = games.find((game) => !game.finished && new Date(game.date) >= new Date()) || games.at(-1);
  const gameTime = new Date(next.date);
  const daysAway = calendarDaysUntil(next.date);

  $('#season').textContent = gameTime.getFullYear();
  $('#next-month').textContent = next.month;
  $('#next-day').textContent = next.day;
  $('#next-weekday').textContent = next.weekday;
  $('#next-context').textContent = next.home ? 'HOME GAME' : 'AWAY GAME';
  $('#next-opponent').textContent = `${next.home ? 'vs.' : 'at'} ${next.opponent.team.displayName}`;
  $('#next-details').textContent = `${result(next).replace(/<[^>]*>/g, '')} · ${next.network} · ${gameLocation(next)}`;
  $('#count-number').textContent = daysAway;
  $('#count-label').textContent = daysAway === 1 ? 'DAY AWAY' : 'DAYS AWAY';

  $('#games').innerHTML = games.map((game) => {
    const opponentName = game.opponent.team.displayName;
    const logo = teamLogo(game.opponent.team);
    return `<article class="game ${game === next ? 'next' : ''}">
      <div class="game-date"><b>${game.day}</b><span>${game.month}</span></div>
      <div class="opponent">
        <div class="opponent-name">${logo ? `<img class="opponent-logo" src="${logo}" alt="${opponentName} logo">` : ''}<span>${game.home ? 'vs. ' : 'at '}${opponentName}</span></div>
        <small>${gameLocation(game)}</small>
      </div>
      <div class="status ${game.finished ? 'final' : ''}">${result(game)}${game.finished ? '' : `<small>${game.network}</small>`}</div>
    </article>`;
  }).join('');

  const completed = games.filter((game) => game.finished);
  const wins = completed.filter((game) => Number(game.selectedTeam.score) > Number(game.opponent.score)).length;
  $('#record').textContent = completed.length ? `${wins}–${completed.length - wins} RECORD` : `${games.length} GAMES`;
  $('#updated').textContent = `ESPN DATA · UPDATED ${dateFormat(Date.now(), { month: 'short', day: 'numeric' }).toUpperCase()}`;
}

if (!/^\d+$/.test(teamId || '')) {
  showState('Team ID required', 'Add ?id=TEAM_ID to this URL. Find it on your school’s ESPN team page: the ID is the number after /id/ (for example, 24 in espn.com/college-football/team/_/id/24/stanford-cardinal).', 'TEAM ID REQUIRED');
} else {
  const endpoint = `https://site.api.espn.com/apis/site/v2/sports/football/college-football/teams/${teamId}/schedule?season=${season}&seasontype=2`;
  fetch(endpoint, { cache: 'no-store' })
    .then((response) => response.ok ? response.json() : Promise.reject(response.status))
    .then((data) => {
      if (!data.team) throw new Error('Team unavailable');
      setTeamIdentity(data.team);
      const games = (data.events || []).map(formatGame).filter(Boolean);
      games.length ? render(games) : showState('Schedule coming soon', 'This team has no regular-season games published for the selected season.', 'SCHEDULE PENDING');
    })
    .catch(() => showState('Team unavailable', 'Unable to load this team. Confirm that the ESPN team ID is valid and try again.', 'TEAM UNAVAILABLE'));
}
