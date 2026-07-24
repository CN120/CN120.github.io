const year = new Date().getFullYear();
const endpoint = `https://site.api.espn.com/apis/site/v2/sports/football/college-football/teams/24/schedule?season=${year}&seasontype=2`;
const $ = (selector) => document.querySelector(selector);
const dateFormat = (date, options) => new Intl.DateTimeFormat('en-US', options).format(new Date(date));

function formatGame(event) {
  const competition = event.competitions[0];
  const stanford = competition.competitors.find(({ team }) => team.id === '24');
  const opponent = competition.competitors.find((team) => team !== stanford);

  return {
    date: event.date,
    day: dateFormat(event.date, { day: 'numeric' }),
    month: dateFormat(event.date, { month: 'short' }).toUpperCase(),
    weekday: dateFormat(event.date, { weekday: 'long' }).toUpperCase(),
    home: stanford.homeAway === 'home',
    finished: competition.status.type.completed,
    stanford,
    opponent,
    venue: competition.venue || {}
  };
}

function result(game) {
  if (!game.finished) return dateFormat(game.date, { hour: 'numeric', minute: '2-digit' });
  const won = Number(game.stanford.score) > Number(game.opponent.score);
  return `<span class="${won ? 'win' : ''}">${won ? 'W' : 'L'} ${game.stanford.score}–${game.opponent.score}</span>`;
}

function render(games) {
  const next = games.find((game) => !game.finished && new Date(game.date) >= new Date()) || games.at(-1);
  const gameTime = new Date(next.date);
  const daysAway = Math.max(0, Math.ceil((gameTime - Date.now()) / 86400000));
  const venue = next.venue.fullName ? ` · ${next.venue.fullName}` : '';

  $('#season').textContent = gameTime.getFullYear();
  $('#next-month').textContent = next.month;
  $('#next-day').textContent = next.day;
  $('#next-weekday').textContent = next.weekday;
  $('#next-context').textContent = next.home ? 'HOME GAME' : 'AWAY GAME';
  $('#next-opponent').textContent = `${next.home ? 'vs.' : 'at'} ${next.opponent.team.displayName}`;
  $('#next-details').textContent = `${result(next).replace(/<[^>]*>/g, '')}${venue}`;
  $('#count-number').textContent = daysAway;
  $('#count-label').textContent = daysAway === 1 ? 'DAY AWAY' : 'DAYS AWAY';

  $('#games').innerHTML = games.map((game) => {
    const location = [game.venue.address?.city, game.venue.address?.state].filter(Boolean).join(', ');
    return `<article class="game ${game === next ? 'next' : ''}">
      <div class="game-date"><b>${game.day}</b><span>${game.month}</span></div>
      <div class="opponent">${game.home ? 'vs. ' : 'at '}${game.opponent.team.displayName}<small>${location}</small></div>
      <div class="status ${game.finished ? 'final' : ''}">${result(game)}</div>
    </article>`;
  }).join('');

  const completed = games.filter((game) => game.finished);
  const wins = completed.filter((game) => Number(game.stanford.score) > Number(game.opponent.score)).length;
  $('#record').textContent = completed.length ? `${wins}–${completed.length - wins} RECORD` : `${games.length} GAMES`;
  $('#updated').textContent = `ESPN DATA · UPDATED ${dateFormat(Date.now(), { month: 'short', day: 'numeric' }).toUpperCase()}`;
}

function showFallback() {
  $('#season').textContent = year;
  $('#next-month').textContent = 'ESPN'; $('#next-day').textContent = '—'; $('#next-weekday').textContent = 'SCHEDULE FEED';
  $('#next-context').textContent = 'STANFORD CARDINAL'; $('#next-opponent').textContent = 'Schedule coming soon';
  $('#next-details').textContent = 'The official season schedule will appear here when ESPN publishes it.';
  $('#count-number').textContent = '—'; $('#count-label').textContent = 'STAY TUNED';
  $('#record').textContent = 'SCHEDULE PENDING'; $('#updated').textContent = 'AWAITING ESPN SCHEDULE DATA';
}

fetch(endpoint, { cache: 'no-store' })
  .then((response) => response.ok ? response.json() : Promise.reject(response.status))
  .then(({ events }) => events?.length ? render(events.map(formatGame)) : showFallback())
  .catch(showFallback);
