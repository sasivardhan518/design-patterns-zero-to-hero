(() => {
  const root = document.documentElement;
  const content = document.getElementById("guide-content");
  const chapterLinks = document.getElementById("chapter-links");
  const search = document.getElementById("chapter-search");
  const searchStatus = document.getElementById("search-status");
  const emptySearch = document.getElementById("empty-search");
  const menuButton = document.getElementById("menu-button");
  const drawerClose = document.getElementById("drawer-close");
  const mobileScrim = document.getElementById("mobile-scrim");
  const themeButton = document.getElementById("theme-button");
  const progressBar = document.getElementById("reading-progress-bar");
  const readingLabel = document.getElementById("reading-label");
  const pageCount = document.getElementById("page-count");
  const previousButton = document.getElementById("previous-page");
  const nextButton = document.getElementById("next-page");
  const previousTitle = document.getElementById("previous-title");
  const nextTitle = document.getElementById("next-title");
  const chapterPath = document.getElementById("chapter-path");
  const articleFooter = document.querySelector(".article-footer");
  const hero = document.querySelector(".hero");
  const quickStart = document.querySelector(".quick-start");
  const pageMap = new Map();
  const pages = [];
  const navItems = [];

  const isPartHeading = element =>
    element.tagName === "H1" &&
    (element.id.startsWith("part-") || element.id === "appendices");

  function makePage(title, id, elements, partHeading = null, isOverview = false) {
    const section = document.createElement("section");
    section.className = "guide-page";
    section.dataset.pageId = id;
    section.setAttribute("aria-label", title);
    if (isOverview) section.classList.add("overview-page");

    if (partHeading) {
      section.dataset.partTitle = partHeading.textContent.trim();
      if (pages.length > 0) {
        const label = document.createElement("p");
        label.className = "page-category";
        label.textContent = partHeading.textContent.trim();
        section.append(label);
      }
    }

    for (const element of elements) {
      section.append(element);
      if (element.id) pageMap.set(element.id, section);
      for (const child of element.querySelectorAll?.("[id]") ?? []) pageMap.set(child.id, section);
    }
    content.append(section);
    pages.push({ element: section, id, title, partTitle: partHeading?.textContent.trim() ?? "", isOverview });
    pageMap.set(id, section);
    return section;
  }

  function paginateGuide() {
    const nodes = [...content.children];
    const firstPartIndex = nodes.findIndex(isPartHeading);
    const introNodes = firstPartIndex < 0 ? nodes : nodes.slice(0, firstPartIndex);
    const introHeading = introNodes.find(element => /^H[12]$/.test(element.tagName) && element.id);
    makePage("Overview", introHeading?.id ?? "overview", introNodes, null, true);

    if (firstPartIndex < 0) return;

    let groupStart = firstPartIndex;
    while (groupStart < nodes.length) {
      const partHeading = nodes[groupStart];
      let groupEnd = groupStart + 1;
      while (groupEnd < nodes.length && !isPartHeading(nodes[groupEnd])) groupEnd++;
      const groupNodes = nodes.slice(groupStart + 1, groupEnd);
      const chapterHeadings = groupNodes.filter(element => element.tagName === "H2" && element.id);

      if (chapterHeadings.length === 0) {
        const heading = partHeading;
        makePage(
          heading.textContent.trim(),
          heading.id,
          [heading, ...groupNodes],
          null
        );
      } else {
        const firstChapterIndex = groupNodes.indexOf(chapterHeadings[0]);
        const beforeFirstChapter = groupNodes.slice(0, firstChapterIndex);
        chapterHeadings.forEach((heading, index) => {
          const start = groupNodes.indexOf(heading);
          const end = index + 1 < chapterHeadings.length
            ? groupNodes.indexOf(chapterHeadings[index + 1])
            : groupNodes.length;
          const sectionNodes = groupNodes.slice(start, end);
          const pageNodes = index === 0
            ? [partHeading, ...beforeFirstChapter, ...sectionNodes]
            : sectionNodes;
          makePage(heading.textContent.trim(), heading.id, pageNodes, partHeading);
        });
      }
      groupStart = groupEnd;
    }
  }

  function sectionText(page) {
    return `${page.title} ${page.partTitle} ${page.element.textContent}`.toLocaleLowerCase();
  }

  function buildNavigation() {
    const list = document.createElement("ul");
    let currentPart = "";
    for (const page of pages) {
      if (page.partTitle && page.partTitle !== currentPart) {
        currentPart = page.partTitle;
        const group = document.createElement("li");
        group.className = "nav-part";
        const groupLink = document.createElement("a");
        groupLink.href = `#${page.id}`;
        groupLink.textContent = currentPart;
        groupLink.dataset.searchText = currentPart.toLocaleLowerCase();
        groupLink.dataset.pageId = page.id;
        group.append(groupLink);
        list.append(group);
        navItems.push({ item: group, link: groupLink, page });
      }

      const item = document.createElement("li");
      item.className = page.isOverview || !page.partTitle ? "nav-chapter nav-top-level" : "nav-chapter";
      const link = document.createElement("a");
      link.href = `#${page.id}`;
      link.textContent = page.isOverview ? "Overview & learning path" : page.title;
      link.dataset.searchText = sectionText(page);
      link.dataset.pageId = page.id;
      item.append(link);
      list.append(item);
      navItems.push({ item, link, page });
    }
    chapterLinks.replaceChildren(list);
  }

  function filterNavigation() {
    const query = search.value.trim().toLocaleLowerCase();
    let visible = 0;
    for (const entry of navItems) {
      const matches = !query || entry.link.dataset.searchText.includes(query);
      entry.item.hidden = !matches;
      if (matches) visible++;
    }
    emptySearch.hidden = visible !== 0;
    searchStatus.textContent = query ? `${visible} matching ${visible === 1 ? "section" : "sections"}` : " ";
  }

  function pageIndexForId(id) {
    const section = pageMap.get(id);
    return section ? pages.findIndex(page => page.element === section) : -1;
  }

  function updateNavigationState() {
    const currentPage = pages[currentPageIndex];
    for (const entry of navItems) {
      const active = entry.page === currentPage ||
        (entry.item.classList.contains("nav-part") && entry.link.dataset.pageId === currentPage.id);
      entry.link.classList.toggle("active", active);
    }
    pageCount.textContent = `${String(currentPageIndex + 1).padStart(2, "0")} / ${String(pages.length).padStart(2, "0")}`;
    readingLabel.textContent = currentPage.isOverview ? "OVERVIEW" : `CHAPTER ${String(currentPageIndex).padStart(2, "0")}`;
    previousButton.disabled = currentPageIndex === 0;
    nextButton.disabled = currentPageIndex === pages.length - 1;
    previousTitle.textContent = pages[currentPageIndex - 1]?.title ?? "Start of guide";
    nextTitle.textContent = pages[currentPageIndex + 1]?.title ?? "End of guide";
    articleFooter.hidden = currentPageIndex !== pages.length - 1;
    hero.hidden = !currentPage.isOverview;
    quickStart.hidden = !currentPage.isOverview;
    document.title = currentPage.isOverview
      ? "Design Patterns: Zero to Hero"
      : `${currentPage.title} · Design Patterns: Zero to Hero`;
    chapterPath.textContent = currentPage.isOverview ? "README.md" : `${currentPage.id}.md`;
    const progress = pages.length > 1 ? currentPageIndex / (pages.length - 1) * 100 : 100;
    progressBar.style.width = `${progress}%`;
  }

  let currentPageIndex = 0;

  function showPage(index, { updateHash = false, targetId = null, scroll = true } = {}) {
    if (index < 0 || index >= pages.length) return;
    currentPageIndex = index;
    for (const [pageIndex, page] of pages.entries()) {
      const active = pageIndex === index;
      page.element.hidden = !active;
      page.element.setAttribute("aria-hidden", String(!active));
      if (active) page.element.inert = false;
      else page.element.inert = true;
    }
    updateNavigationState();

    const selected = pages[index];
    if (updateHash && location.hash !== `#${encodeURIComponent(targetId ?? selected.id)}`) {
      history.pushState({ guidePage: selected.id }, "", `#${encodeURIComponent(targetId ?? selected.id)}`);
    }
    if (scroll) {
      window.scrollTo({ top: 0, behavior: "instant" });
      if (targetId && targetId !== selected.id) {
        requestAnimationFrame(() => document.getElementById(targetId)?.scrollIntoView({ block: "start" }));
      }
    }
    renderDiagrams(selected.element);
  }

  function navigateFromLink(event) {
    const link = event.currentTarget;
    const id = decodeURIComponent(link.hash.slice(1));
    const index = pageIndexForId(id) >= 0 ? pageIndexForId(id) : pageIndexForId(link.dataset.pageId);
    if (index < 0) return;
    event.preventDefault();
    const targetPage = pages[index];
    const targetId = pageMap.has(id) ? id : targetPage.id;
    showPage(index, { updateHash: true, targetId, scroll: true });
    closeMobileNav();
  }

  function navigateToPage(index) {
    const page = pages[index];
    if (page) showPage(index, { updateHash: true, targetId: page.id, scroll: true });
  }

  function closeMobileNav() {
    document.body.classList.remove("nav-open");
    menuButton.setAttribute("aria-expanded", "false");
    menuButton.setAttribute("aria-label", "Open chapter navigation");
  }

  function setupTheme() {
    function updateDiagramTheme() {
      if (!window.mermaid) return;
      window.mermaid.initialize({
        startOnLoad: false,
        theme: root.dataset.theme === "dark" ? "dark" : "neutral",
        securityLevel: "strict"
      });
      for (const diagram of content.querySelectorAll(".mermaid[data-source]")) {
        diagram.removeAttribute("data-processed");
        diagram.replaceChildren();
        diagram.textContent = diagram.dataset.source;
      }
      renderDiagrams(pages[currentPageIndex].element);
    }

    function applyTheme(theme) {
      root.dataset.theme = theme;
      const dark = theme === "dark";
      themeButton.setAttribute("aria-label", dark ? "Switch to light theme" : "Switch to dark theme");
      document.querySelector('meta[name="theme-color"]').content = dark ? "#0d1117" : "#f5f7fa";
      updateDiagramTheme();
    }
    let savedTheme = null;
    try {
      savedTheme = localStorage.getItem("pattern-atlas-theme");
    } catch (error) {
      console.warn("Theme preference could not be read from local storage.", error);
    }
    applyTheme(savedTheme || "dark");
    themeButton.addEventListener("click", () => {
      const next = root.dataset.theme === "dark" ? "light" : "dark";
      applyTheme(next);
      try {
        localStorage.setItem("pattern-atlas-theme", next);
      } catch (error) {
        console.warn("Theme preference could not be saved to local storage.", error);
      }
    });
  }

  async function copyCode(button, code) {
    try {
      await navigator.clipboard.writeText(code.textContent);
      button.textContent = "Copied";
      window.setTimeout(() => { button.textContent = "Copy"; }, 1400);
    } catch (error) {
      button.textContent = "Copy failed";
      console.warn("Code could not be copied to the clipboard.", error);
      window.setTimeout(() => { button.textContent = "Copy"; }, 1800);
    }
  }

  function enhanceCode() {
    for (const code of content.querySelectorAll("pre code.language-mermaid")) {
      const diagram = document.createElement("div");
      diagram.className = "mermaid";
      diagram.dataset.source = code.textContent;
      diagram.textContent = diagram.dataset.source;
      code.parentElement.replaceWith(diagram);
    }

    for (const pre of content.querySelectorAll("pre")) {
      if (pre.querySelector(".mermaid")) continue;
      const code = pre.querySelector("code");
      if (!code) continue;
      const language = [...code.classList].find(name => name.startsWith("language-"))?.slice(9) ?? "code";
      pre.dataset.language = language.toUpperCase();
      const copy = document.createElement("button");
      copy.className = "copy-button";
      copy.type = "button";
      copy.textContent = "Copy";
      copy.setAttribute("aria-label", "Copy code");
      copy.addEventListener("click", () => copyCode(copy, code));
      pre.append(copy);
    }

    for (const link of content.querySelectorAll('a[href^="http"]')) {
      link.target = "_blank";
      link.rel = "noopener noreferrer";
    }
  }

  function renderDiagrams(page) {
    if (!window.mermaid) return;
    const diagrams = [...page.querySelectorAll(".mermaid:not([data-processed])")];
    if (!diagrams.length) return;
    window.mermaid.run({ nodes: diagrams }).catch(error => {
      console.error("One or more Mermaid diagrams could not be rendered.", error);
    });
  }

  paginateGuide();
  buildNavigation();
  enhanceCode();
  setupTheme();
  filterNavigation();

  search.addEventListener("input", filterNavigation);
  menuButton.addEventListener("click", () => {
    const open = !document.body.classList.contains("nav-open");
    document.body.classList.toggle("nav-open", open);
    menuButton.setAttribute("aria-expanded", String(open));
    menuButton.setAttribute("aria-label", open ? "Close chapter navigation" : "Open chapter navigation");
  });
  drawerClose.addEventListener("click", closeMobileNav);
  mobileScrim.addEventListener("click", closeMobileNav);
  previousButton.addEventListener("click", () => navigateToPage(currentPageIndex - 1));
  nextButton.addEventListener("click", () => navigateToPage(currentPageIndex + 1));

  document.addEventListener("keydown", event => {
    if (event.key === "/" && !["INPUT", "TEXTAREA"].includes(document.activeElement.tagName)) {
      event.preventDefault();
      search.focus();
    }
    if (event.key === "Escape" && document.body.classList.contains("nav-open")) closeMobileNav();
    if (event.altKey && event.key === "ArrowLeft") navigateToPage(currentPageIndex - 1);
    if (event.altKey && event.key === "ArrowRight") navigateToPage(currentPageIndex + 1);
  });

  document.addEventListener("click", event => {
    if (!(event.target instanceof Element)) return;
    const link = event.target.closest('a[href^="#"]');
    if (!link) return;
    const id = decodeURIComponent(link.hash.slice(1));
    if (!pageMap.has(id)) return;
    navigateFromLink({ currentTarget: link, preventDefault: () => event.preventDefault() });
  });

  function syncFromLocation() {
    const id = decodeURIComponent(location.hash.slice(1));
    const index = id ? pageIndexForId(id) : 0;
    showPage(index >= 0 ? index : 0, { scroll: true });
  }
  window.addEventListener("hashchange", syncFromLocation);
  window.addEventListener("popstate", syncFromLocation);

  let savedIndex = 0;
  if (location.hash) {
    const id = decodeURIComponent(location.hash.slice(1));
    const matchingIndex = pageIndexForId(id);
    if (matchingIndex >= 0) savedIndex = matchingIndex;
  }
  showPage(savedIndex, { scroll: false });
})();
