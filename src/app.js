(function(){
  const root=document.querySelector('[data-mjr-scholarships]');
  if(!root)return;

  const feedUrl=root.dataset.feed||'scholarships.json';
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

  const mediaCategories=[
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

  const generalCategories=[
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
    <section class="mjr-scholarships">
      <header class="mjr-hero">
        <p class="mjr-eyebrow">Student & Career Resource</p>
        <h1>MJR Scholarships & Fellowships</h1>
        <p>Find funding and career-development opportunities for media, communications, music-industry and general degree paths.</p>
      </header>

      <div class="mjr-tabs" role="tablist">
        <button class="mjr-tab active" data-group="all">All Opportunities</button>
        <button class="mjr-tab" data-group="media">Media & Communications</button>
        <button class="mjr-tab" data-group="general">General Scholarships</button>
      </div>

      <div class="mjr-tools">
        <input
          class="mjr-search"
          type="search"
          placeholder="Search by scholarship, provider, school or keyword"
          aria-label="Search scholarships"
        >

        <div class="mjr-filters">
          <select data-filter="category" aria-label="Category">
            <option value="all">All categories</option>
          </select>

          <select data-filter="level" aria-label="Education level">
            <option value="all">All education levels</option>
          </select>

          <select data-filter="region" aria-label="State or region">
            <option value="all">All states & regions</option>
          </select>

          <select data-filter="scope" aria-label="Availability">
            <option value="all">All availability</option>
            <option value="open">Open to any school</option>
            <option value="school">Institution-specific</option>
          </select>

          <select data-filter="sort" aria-label="Sort">
            <option value="deadline">Deadline: soonest</option>
            <option value="title">Name: A–Z</option>
            <option value="provider">Provider: A–Z</option>
          </select>
        </div>
      </div>

      <div class="mjr-summary">
        <span data-count>Loading opportunities…</span>
        <button class="mjr-clear">Clear filters</button>
      </div>

      <div class="mjr-grid" data-results></div>
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

  const esc=value=>String(value??'').replace(
    /[&<>"']/g,
    character=>({
      '&':'&amp;',
      '<':'&lt;',
      '>':'&gt;',
      '"':'&quot;',
      "'":'&#39;'
    }[character])
  );

  const formatDate=value=>value
    ? new Intl.DateTimeFormat('en-US',{
        month:'short',
        day:'numeric',
        year:'numeric',
        timeZone:'UTC'
      }).format(new Date(`${value}T00:00:00Z`))
    : 'Deadline to be announced';

  const today=()=>new Date().toISOString().slice(0,10);

  const daysUntil=value=>Math.ceil(
    (
      Date.parse(`${value}T00:00:00Z`)-
      Date.parse(`${today()}T00:00:00Z`)
    )/86400000
  );

  function applicationStatus(item){
    if(item.opens&&item.opens>today()){
      return {label:'Opens soon',className:'soon'};
    }

    if(!item.deadline){
      return {label:'Deadline TBA',className:'tba'};
    }

    const days=daysUntil(item.deadline);

    if(days>=0&&days<=30){
      return {
        label:'Deadline approaching',
        className:'approaching'
      };
    }

    if(days<0){
      return {label:'Next cycle TBA',className:'tba'};
    }

    return {label:'Open now',className:'open'};
  }

  function populate(){
    const categories=
      state.group==='media'
        ? mediaCategories
        : state.group==='general'
          ? generalCategories
          : [...mediaCategories,...generalCategories];

    el.category.innerHTML=
      '<option value="all">All categories</option>'+
      categories.map(value=>`<option>${esc(value)}</option>`).join('');

    const levels=[
      ...new Set(
        state.records.flatMap(item=>item.educationLevels||[])
      )
    ].sort();

    el.level.innerHTML=
      '<option value="all">All education levels</option>'+
      levels.map(value=>`<option>${esc(value)}</option>`).join('');

    const regions=[
      ...new Set(
        state.records.flatMap(item=>item.states||[])
      )
    ].sort((a,b)=>{
      if(a==='Nationwide')return -1;
      if(b==='Nationwide')return 1;
      return a.localeCompare(b);
    });

    el.region.innerHTML=
      '<option value="all">All states & regions</option>'+
      regions.map(value=>`<option>${esc(value)}</option>`).join('');
  }

  function render(){
    const query=state.q.toLowerCase();

    let rows=state.records.filter(item=>{
      const searchableText=[
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
        .toLowerCase();

      return (
        (state.group==='all'||item.programGroup===state.group)&&
        (state.category==='all'||item.categories.includes(state.category))&&
        (state.level==='all'||(item.educationLevels||[]).includes(state.level))&&
        (state.region==='all'||(item.states||[]).includes(state.region))&&
        (
          state.scope==='all'||
          (
            state.scope==='school'
              ? item.institutionSpecific
              : !item.institutionSpecific
          )
        )&&
        (!query||searchableText.includes(query))
      );
    });

    rows.sort((a,b)=>{
      if(state.sort==='title'){
        return a.title.localeCompare(b.title);
      }

      if(state.sort==='provider'){
        return a.provider.localeCompare(b.provider);
      }

      return (a.deadline||'9999-12-31')
        .localeCompare(b.deadline||'9999-12-31');
    });

    el.count.textContent=
      `Showing ${rows.length} of ${state.records.length} opportunities`;

    el.results.innerHTML=rows.length
      ? rows.map(item=>{
          const status=applicationStatus(item);

          return `
            <article class="mjr-card ${item.featured?'featured':''}">
              <div class="mjr-badges">
                ${item.featured
                  ? '<span class="mjr-badge">Featured</span>'
                  : ''
                }

                <span class="mjr-badge">
                  ${item.programGroup==='media'
                    ? 'Media & Communications'
                    : 'General'
                  }
                </span>

                ${item.institutionSpecific
                  ? '<span class="mjr-badge school">Institution-specific</span>'
                  : ''
                }

                <span class="mjr-badge status-${status.className}">
                  ${status.label}
                </span>
              </div>

              <h2>${esc(item.title)}</h2>
              <p class="mjr-provider">${esc(item.provider)}</p>

              <div class="mjr-meta">
                <div>
                  <span>Award</span>
                  <strong>${esc(item.award||'Varies')}</strong>
                </div>

                <div>
                  <span>Deadline</span>
                  <strong>${esc(formatDate(item.deadline))}</strong>
                </div>
              </div>

              <p>${esc(item.summary||'')}</p>

              <p>
                <strong>Who can apply:</strong>
                ${esc(item.eligibility||'See official details.')}
              </p>

              <a
                class="mjr-link"
                href="${esc(item.url)}"
                target="_blank"
                rel="noopener noreferrer"
              >
                View Official Details
              </a>
            </article>
          `;
        }).join('')
      : `
          <div class="mjr-empty">
            <strong>No matching opportunities found.</strong><br>
            Try clearing one or more filters.
          </div>
        `;
  }

  el.tabs.forEach(button=>{
    button.addEventListener('click',()=>{
      state.group=button.dataset.group;
      state.category='all';

      el.tabs.forEach(tab=>{
        tab.classList.toggle('active',tab===button);
      });

      populate();
      render();
    });
  });

  el.search.addEventListener('input',()=>{
    state.q=el.search.value.trim();
    render();
  });

  ['category','level','region','scope','sort'].forEach(key=>{
    el[key].addEventListener('change',()=>{
      state[key]=el[key].value;
      render();
    });
  });

  root.querySelector('.mjr-clear').addEventListener('click',()=>{
    state.q='';
    state.category='all';
    state.level='all';
    state.region='all';
    state.scope='all';
    state.sort='deadline';

    el.search.value='';
    el.category.value='all';
    el.level.value='all';
    el.region.value='all';
    el.scope.value='all';
    el.sort.value='deadline';

    render();
  });

  fetch(feedUrl,{cache:'no-store'})
    .then(response=>{
      if(!response.ok)throw new Error(`HTTP ${response.status}`);
      return response.json();
    })
    .then(feed=>{
      state.records=feed.records||[];
      populate();
      render();
    })
    .catch(()=>{
      el.count.textContent='Unable to load opportunities';
      el.results.innerHTML=`
        <div class="mjr-empty">
          <strong>The scholarship directory could not be loaded.</strong><br>
          Please try again shortly.
        </div>
      `;
    });
})();
