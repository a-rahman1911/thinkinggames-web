# Round 14: evidence

Taken on 2026-11-16 and 17 from the production build of this branch, in headless Chromium, with the switch laid over production content in memory (nothing was written to Sanity). The build was served under the host names below. Every request to a PostHog address was caught in the browser and answered locally, so **nothing reached PostHog**; what is listed is what PostHog would have received.

## 1. No PostHog before consent

In each state the visitor opened `/`, chose "parent" in the pop-up, ticked a filter, opened a game, went to Teachers, opened a moment, searched, opened an article and pressed "Copy link", then waited.

| State | Banner on arrival | Footer links | Requests made | To a PostHog address | PostHog library file fetched | Hosts contacted | Cookies | localStorage | sessionStorage |
|---|---|---|---|---|---|---|---|---|---|
| thinkinggames.com, before any choice | yes | Privacy, Contact, Cookie settings | 155 | **0** | **0** | thinkinggames.com, cdn.sanity.io | `tg_audience=teachers` | (empty) | (empty) |
| thinkinggames.com, after Decline | yes | Privacy, Contact, Cookie settings | 153 | **0** | **0** | thinkinggames.com, cdn.sanity.io | `tg_consent=declined` `tg_audience=teachers` | (empty) | (empty) |
| thinkinggames.com, Global Privacy Control on | no | Privacy, Contact, Cookie settings | 151 | **0** | **0** | thinkinggames.com, cdn.sanity.io | `tg_audience=teachers` | (empty) | (empty) |
| thinkinggames.com, GPC on, earlier "accepted" cookie | no | Privacy, Contact, Cookie settings | 151 | **0** | **0** | thinkinggames.com, cdn.sanity.io | `tg_consent=accepted` `tg_audience=teachers` | (empty) | (empty) |
| www.thinkinggames.com, before any choice | yes | Privacy, Contact, Cookie settings | 155 | **0** | **0** | www.thinkinggames.com, cdn.sanity.io | `tg_audience=teachers` | (empty) | (empty) |
| thinkinggames-web.vercel.app, "accepted" cookie present | no | Privacy, Contact | 151 | **0** | **0** | thinkinggames-web.vercel.app, cdn.sanity.io | `tg_consent=accepted` `tg_audience=teachers` | (empty) | (empty) |
| localhost-like host (preview.example.test), "accepted" cookie | no | Privacy, Contact | 151 | **0** | **0** | preview.example.test, cdn.sanity.io | `tg_consent=accepted` `tg_audience=teachers` | (empty) | (empty) |

`tg_audience` is the necessary cookie from choosing "parent" and then Teachers. The same run with the switch off made no PostHog request either, and `/`, `/teachers` and `/parents` were identical to `main` (same pixels, same HTML) at 390 and 1280px.

## 2. After Accept: pageviews

Pressing Accept made no page load; PostHog started on the page. One `$pageview` per page:

| `$pageview` path | After |
|---|---|
| `/` | `/`, pop-up open: press Accept in the banner |
| `/teachers` | Header: the Teachers pill (from Parents) |
| `/ideas` | Header: the Ideas link |
| `/ideas/three-warm-ups-for-monday` | Ideas: open the article "three-warm-ups-for-monday" |
| `/parents` | Header: the Parents pill (from an article) |
| `/teachers` | Open `/teachers?list=` with two games (full load) |
| `/nope` | Unknown address `/nope` (404 page) |
| `/` | Open `/` again (accepted earlier): the pop-up opens |
| `/` | Open `/` again (accepted earlier): the pop-up opens |
| `/` | Open `/` again (accepted earlier): the pop-up opens |
| `/parents` | (phone) Parents: "+ Save" on the first card |

Choosing "parent" in the pop-up changes the address from `/` to `/parents` on the same page and sends no second `$pageview`.

## 3. After Accept: events

In the order they were triggered. "beacon" means sent with the beacon transport. `site_version` and `persona` (once chosen) are on every event, `$pageview` and autocapture included.

| Event | Where it was triggered | Properties sent | Transport |
|---|---|---|---|
| `welcome_popup_shown` | `/`, pop-up open: press Accept in the banner | `{"site_version":"next"}` | fetch |
| `persona_selected` | `/`, pop-up: "I'm a parent" | `{"site_version":"next","persona":"parent","method":"popup"}` | fetch |
| `filter_applied` | Parents: tick the first filter option | `{"site_version":"next","persona":"parent","page":"parents","group":"Age","value":"Ages 4-5","selected":true,"results_count":20}` | fetch |
| `filter_applied` | Parents: untick it with the × on its chip | `{"site_version":"next","persona":"parent","page":"parents","group":"Age","value":"Ages 4-5","selected":false,"results_count":60}` | fetch |
| `game_saved` | Parents: "+ Save" on the first card | `{"site_version":"next","persona":"parent","game":"All Ten","game_id":"game-all-ten","program":"Beast Academy","surface":"library"}` | fetch |
| `game_saved` | Parents: "+ Save" on cards 1 and 3 | `{"site_version":"next","persona":"parent","game":"All Ten","game_id":"game-all-ten","program":"Beast Academy","surface":"library"}` | fetch |
| `game_saved` | Parents: "+ Save" on cards 1 and 3 | `{"site_version":"next","persona":"parent","game":"Big Numbers","game_id":"game-big-numbers","program":"PlayMath","surface":"library"}` | fetch |
| `card_clicked` | Parents library: "Play ↗" on the second card | `{"site_version":"next","persona":"parent","program":"PBS KIDS","game":"Awesome Obstacles","game_id":"game-awesome-obstacles","external_url":"https://pbskids.org/games/play/team-hamster-platformer/2149771","surface":"library","position":2}` | beacon |
| `saved_list_opened` | Saved-list bar: "View list" | `{"site_version":"next","persona":"parent","count":2}` | fetch |
| `card_clicked` | Saved-list drawer: "Play ↗" on the second row | `{"site_version":"next","persona":"parent","program":"PlayMath","game":"Big Numbers","game_id":"game-big-numbers","external_url":"https://playmath.org/games/mm-big-numbers","surface":"saved_list","position":2}` | beacon |
| `saved_list_link_copied` | Saved-list drawer: "Copy link to this list" | `{"site_version":"next","persona":"parent","count":2,"method":"link"}` | fetch |
| `saved_list_link_copied` | Saved-list drawer: "Copy as text" | `{"site_version":"next","persona":"parent","count":2,"method":"text"}` | fetch |
| `challenge_clicked` | Parents: a Thinking Challenge button | `{"site_version":"next","persona":"parent","band":"Ages 5-6","external_url":"https://mathstarchallenge.org/p/KunYM6ZrxhPi"}` | beacon |
| `brand_clicked` | Parents: a logo in "Brands we support" | `{"site_version":"next","persona":"parent","brand":"Funexpected","external_url":"https://funexpectedapps.com","page":"parents"}` | beacon |
| `persona_selected` | Header: the Teachers pill (from Parents) | `{"site_version":"next","persona":"teacher","method":"header"}` | fetch |
| `moment_opened` | Teachers: open the second closed moment | `{"site_version":"next","persona":"teacher","moment":"Indoor recess","position":3}` | fetch |
| `card_clicked` | Teachers, in that moment: "Open game ↗" on the second row | `{"site_version":"next","persona":"teacher","program":"PBS KIDS","game":"Marble-ous Run","game_id":"game-marble-ous-run","external_url":"https://pbskids.org/games/play/marble-run/1822644","surface":"moment","moment":"Indoor recess","position":2}` | beacon |
| `filter_applied` | Teachers: press a Grade option | `{"site_version":"next","persona":"teacher","page":"teachers","group":"Grade","value":"2-3","selected":true,"results_count":20}` | fetch |
| `filter_applied` | Teachers: press it again (untick) | `{"site_version":"next","persona":"teacher","page":"teachers","group":"Grade","value":"2-3","selected":false,"results_count":60}` | fetch |
| `search_performed` | Teachers: type "  Ma" in search, pause, then "th", pause | `{"site_version":"next","persona":"teacher","query":"ma","results_count":6}` | fetch |
| `search_performed` | Teachers: type "  Ma" in search, pause, then "th", pause | `{"site_version":"next","persona":"teacher","query":"math","results_count":3}` | fetch |
| `card_clicked` | Teachers search results: "Open game ↗" on the first row | `{"site_version":"next","persona":"teacher","program":"PlayMath","game":"CrossyBlock Math","game_id":"game-crossyblock-math","external_url":"https://playmath.org/games/crossyblock-math","surface":"search","position":1}` | beacon |
| `game_saved` | Teachers search results: "+ Save" on the first row | `{"site_version":"next","persona":"teacher","game":"CrossyBlock Math","game_id":"game-crossyblock-math","program":"PlayMath","surface":"search"}` | fetch |
| `challenge_clicked` | Teachers: a Thinking Challenge button | `{"site_version":"next","persona":"teacher","band":"Grades 2-3","external_url":"https://mathstarchallenge.org/p/7pmezLbcPW80"}` | beacon |
| `brand_clicked` | Teachers: a logo in "Brands we support" | `{"site_version":"next","persona":"teacher","brand":"PlayMath","external_url":"https://playmath.org","page":"teachers"}` | beacon |
| `card_clicked` | Article: the game button of its second game card | `{"site_version":"next","persona":"teacher","program":"PBS KIDS","game":"Dominoes","game_id":"game-dominoes","external_url":"https://pbskids.org/games/play/alma-dominoes/1679821","surface":"article","article":"three-warm-ups-for-monday","position":2}` | beacon |
| `article_link_copied` | Article: "Copy link" | `{"site_version":"next","persona":"teacher","article":"three-warm-ups-for-monday"}` | fetch |
| `persona_selected` | Header: the Parents pill (from an article) | `{"site_version":"next","persona":"parent","method":"header"}` | fetch |
| `saved_list_shared_opened` | Open `/teachers?list=` with two games (full load) | `{"site_version":"next","persona":"parent","count":2}` | fetch |
| `welcome_popup_shown` | Open `/` again (accepted earlier): the pop-up opens | `{"site_version":"next"}` | fetch |
| `welcome_popup_dismissed` | Pop-up closed with × | `{"site_version":"next","method":"close"}` | fetch |
| `welcome_popup_shown` | Open `/` again (accepted earlier): the pop-up opens | `{"site_version":"next"}` | fetch |
| `welcome_popup_dismissed` | Pop-up closed with Esc | `{"site_version":"next","method":"escape"}` | fetch |
| `welcome_popup_shown` | Open `/` again (accepted earlier): the pop-up opens | `{"site_version":"next"}` | fetch |
| `welcome_popup_dismissed` | Pop-up closed by a click on the backdrop | `{"site_version":"next","method":"backdrop"}` | fetch |
| `game_saved` | (phone) Parents: "+ Save" on the first card | `{"site_version":"next","persona":"parent","game":"All Ten","game_id":"game-all-ten","program":"Beast Academy","surface":"library"}` | fetch |
| `saved_list_opened` | (phone) saved-list bar: "View list" | `{"site_version":"next","persona":"parent","count":1}` | fetch |
| `saved_list_link_copied` | (phone, share sheet available) "Copy link to this list" | `{"site_version":"next","persona":"parent","count":1,"method":"share"}` | fetch |

Steps that must send nothing sent nothing: un-saving a game, closing a moment, the moment that is open on arrival.
