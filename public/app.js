(function(){
  const root=document.querySelector('[data-mjr-scholarships]');
  if(!root||root.dataset.ready)return;

  root.dataset.ready='1';

  const feedUrl=root.dataset.feed||'scholarships.json';
  const heading=root.dataset.embedded==='true'?'h2':'h1';

  const state={
    group:'all',
    q:'',
    category:'all',
    level:'all',
    region:'all',
    scope:'all',
    sort:'deadline',
    records:[]
  };

  const media=[
    'Journalism & News',
    'Radio & Podcasting',
    'Television & Video',
    'Digital Media',
    'Public Relations & Communications',
    'Music Industry',
    'Production & Multimedia',
    'Broadcast Engineering & Technology',
    'Advertising & Media Sales'
  ];

  const general=[
    'Any Major',
    'Academic Achievement',
    'Financial Need',
    'Community Service',
    'First-Generation Students',
    'Veterans & Military Families',
    'Diversity & Identity',
    'Geographic & State Residency',
    'Employer, Union & Family Affiliations'
  ];

  root.innerHTML=`
    <section class="mjr-scholarships" aria-label="Scholarship finder">
      <header class="mjr-hero">
        <p class="mjr-eyebrow">Student & Career Resource</p>
        <${heading}>MJR Scholarships & Fellowships</${heading}>
        <p>Find funding and career-development opportunities for media, communications, music-industry and general degree paths.</p>
      </header>

      <div class="mjr-tabs" role="tablist" aria-label="Opportunity type">
        <button type="button" class="mjr-tab active" data-group="all" role="tab" aria-selected="true">All Opportunities</button>
        <button type="button" class="mjr-tab" data-group="media" role="tab" aria-selected="false">Media & Communications</button>
        <button type="button" class="mjr-tab" data-group="general" role="tab" aria-selected="false">General Scholarships</button>
      </div>

      <div class="mjr-tools">
        <label class="mjr-sr" for="mjr-search">Search scholarships</label>
        <input id="mjr-search" class="mjr-search" type="search" placeholder="Search by scholarship, provider, school or keyword" autocomplete="off">

        <div class="mjr-filters">
          <label>
            <span>Category</span>
            <select data-filter="category"></select>
          </label>

          <label>
            <span>Education level</span>
            <select data-filter="level"></select>
          </label>

          <label>
            <span>State or region</span>
            <select data-filter="region"></select>
          </label>

          <label>
            <span>Availability</span>
            <select data-filter="scope">
              <option value="all">All availability</option>
              <option value="open">Open to any school</option>
              <option value="school">Institution-specific</option>
            </select>
          </label>

          <label>
            <span>Sort</span>
            <select data-filter="sort">
              <option value="deadline">Deadline: soonest</option>
              <option value="title">Name: A–Z</option>
              <option value="provider">Provider: A–Z</option>
            </select>
          </label>
        </div>
      </div>

      <div class="mjr-summary">
        <span data-count role="status" aria-live="polite">Loading scholarship opportunities…</span>
        <button type="button" class="mjr-clear">Clear filters</button>
      </div>

      <div class="mjr-grid" data-results aria-busy="true">
        <div class="mjr-loading">Loading scholarship opportunities…</div>
      </div>

      <footer class="mjr-note">
        <strong>Please verify before applying.</strong>
        Scholarship details may change. Review eligibility, deadlines and application requirements on the official provider website. Media Jobs Report is not affiliated with or endorsed by the listed providers.
      </footer>
    </section>
  `;

  const el={
    tabs:[...root.querySelectorAll('.mjr-tab')],
    search:root.querySelector('.mjr-search'),
    category:root.querySelector('[data-filter="category"]'),
    level:root.querySelector('[data-filter="level"]'),
    region:root.querySelector('[data-filter="region"]'),
    scope:root.querySelector('[data-filter="scope"]'),
    sort:root.querySelector('[data-filter="sort"]'),
    count:root.querySelector('[data-count]'),
    results:root.querySelector('[data-results]')
  };

  const esc=value=>String(value??'').replace(/[&<>"']/g,character=>({
    '&':'&amp;',
    '<':'&lt;',
    '>':'&gt;',
    '"':'&quot;',
    "'":'&#39;'
  }[character]));

  const fmt=value=>value
    ?new Intl.DateTimeFormat('en-US',{
      month:'short',
      day:'numeric',
      year:'numeric',
      timeZone:'UTC'
    }).format(new Date(`${value}T00:00:00Z`))
    :'Deadline to be announced';

  const now=()=>new Date().toISOString().slice(0,10);

  function status(item){
    if(item.opens&&item.opens>now())return['Opens soon','soon'];
    if(!item.deadline)return['Deadline TBA','tba'];

    const days=Math.ceil(
      (Date.parse(item.deadline)-Date.parse(now()))/86400000
    );

    if(days<0)return['Next cycle TBA','tba'];
    if(days<=30)return['Deadline approaching','approaching'];

    return['Open now','open'];
  }

  const options=(label,values)=>
    `<option value="all">${label}</option>`+
    values.map(value=>`<option value="${esc(value)}">${esc(value)}</option>`).join('');

  function populate(){
    const categories=state.group==='media'
      ?media
      :state.group==='general'
        ?general
        :[...media,...general];

    el.category.innerHTML=options('All categories',categories);

    el.level.innerHTML=options(
      'All education levels',
      [...new Set(state.records.flatMap(item=>item.educationLevels||[]))].sort()
    );

    el.region.innerHTML=options(
      'All states & regions',
      [...new Set(state.records.flatMap(item=>item.states||[]))].sort((a,b)=>
        a==='Nationwide'?-1:
        b==='Nationwide'?1:
        a.localeCompare(b)
      )
    );
  }

  function render(){
    const query=state.q.toLowerCase();

    const rows=state.records.filter(item=>
      (state.group==='all'||item.programGroup===state.group)&&
      (state.category==='all'||item.categories.includes(state.category))&&
      (state.level==='all'||(item.educationLevels||[]).includes(state.level))&&
      (state.region==='all'||(item.states||[]).includes(state.region))&&
      (
        state.scope==='all'||
        (
          state.scope==='school'
            ?item.institutionSpecific
            :!item.institutionSpecific
        )
      )&&
      (
        !query||
        [
          item.title,
          item.provider,
          item.summary,
          item.eligibility,
          item.institution,
          ...item.categories,
          ...(item.states||[])
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
          .includes(query)
      )
    );

    rows.sort((a,b)=>
      state.sort==='title'
        ?a.title.localeCompare(b.title)
        :state.sort==='provider'
          ?a.provider.localeCompare(b.provider)
          :(a.deadline||'9999-12-31').localeCompare(b.deadline||'9999-12-31')
    );

    el.count.textContent=`Showing ${rows.length} of ${state.records.length} opportunities`;
    el.results.setAttribute('aria-busy','false');

    el.results.innerHTML=rows.length
      ?rows.map(item=>{
        const itemStatus=status(item);

        return `
          <article class="mjr-card ${item.featured?'featured':''}">
            <div class="mjr-badges">
              ${item.featured?'<span class="mjr-badge">Featured</span>':''}
              <span class="mjr-badge">${item.programGroup==='media'?'Media & Communications':'General'}</span>
              ${item.institutionSpecific?'<span class="mjr-badge school">Institution-specific</span>':''}
              <span class="mjr-badge status-${itemStatus[1]}">${itemStatus[0]}</span>
            </div>

            <h3>${esc(item.title)}</h3>
            <p class="mjr-provider">${esc(item.provider)}</p>

            <div class="mjr-meta">
              <div>
                <span>Award</span>
                <strong>${esc(item.award||'Varies')}</strong>
              </div>

              <div>
                <span>Deadline</span>
                <strong>${esc(fmt(item.deadline))}</strong>
              </div>
            </div>

            <p>${esc(item.summary||'')}</p>

            <p>
              <strong>Who can apply:</strong>
              ${esc(item.eligibility||'See official details.')}
            </p>

            ${item.verifiedOn
              ?`<p class="mjr-verified">Source reviewed ${esc(fmt(item.verifiedOn))}</p>`
              :''
            }

            <a class="mjr-link" href="${esc(item.url)}" target="_blank" rel="noopener noreferrer">
              View Official Details
              <span aria-hidden="true">↗</span>
              <span class="mjr-sr"> (opens in a new tab)</span>
            </a>
          </article>
        `;
      }).join('')
      :`
        <div class="mjr-empty">
          <strong>No matching opportunities found.</strong><br>
          Try clearing one or more filters.
        </div>
      `;
  }

  function load(){
    el.results.setAttribute('aria-busy','true');

    fetch(feedUrl,{cache:'no-store'})
      .then(response=>{
        if(!response.ok)throw Error();
        return response.json();
      })
      .then(feed=>{
        if(!Array.isArray(feed.records))throw Error();

        state.records=feed.records;
        populate();
        render();
      })
      .catch(()=>{
        el.count.textContent='Unable to load opportunities';
        el.results.setAttribute('aria-busy','false');

        el.results.innerHTML=`
          <div class="mjr-empty">
            <strong>The scholarship directory could not be loaded.</strong><br>
            Please check your connection and try again.<br>
            <button type="button" class="mjr-retry">Try again</button>
          </div>
        `;

        el.results.querySelector('.mjr-retry').onclick=load;
      });
  }

  el.tabs.forEach(button=>{
    button.onclick=()=>{
      state.group=button.dataset.group;
      state.category='all';

      el.tabs.forEach(tab=>{
        const selected=tab===button;
        tab.classList.toggle('active',selected);
        tab.setAttribute('aria-selected',selected);
      });

      populate();
      render();
    };
  });

  el.search.oninput=()=>{
    state.q=el.search.value.trim();
    render();
  };

  ['category','level','region','scope','sort'].forEach(key=>{
    el[key].onchange=()=>{
      state[key]=el[key].value;
      render();
    };
  });

  root.querySelector('.mjr-clear').onclick=()=>{
    Object.assign(state,{
      q:'',
      category:'all',
      level:'all',
      region:'all',
      scope:'all',
      sort:'deadline'
    });

    el.search.value='';
    el.category.value='all';
    el.level.value='all';
    el.region.value='all';
    el.scope.value='all';
    el.sort.value='deadline';

    render();
  };

  load();
})();
