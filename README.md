# Ignition Brain Campaigns

DAILY INCOME STEPS — BRANDED TRACKING REDIRECT V1







IMPLEMENTATION ONLY — DO NOT CREATE A PLAN.







Build a very small production-ready branded redirect system for outbound campaign tracking.







This belongs in the Daily Income Steps project.







==================================================



FIRST LIVE REDIRECT



==================================================







Create this first redirect:







Public branded URL:







https://go.dailyincomesteps.com/ght1







Destination URL:







https://www.trafficignition.com/lp3/darrenlaverick/Herculist-Test1







Label:







GHT1 — HercuList Test 1







IMPORTANT:







Preserve the destination URL EXACTLY.







Do not strip, rewrite or alter any part of:







https://www.trafficignition.com/lp3/darrenlaverick/Herculist-Test1







==================================================



PURPOSE



==================================================







I want to use short branded URLs for marketing tests.







Future examples may include:







/ght1



/ght2



/ght3







/ti1



/ti2



/ti3







/dim1



/dim2



/dim3







The short public URL should redirect immediately to the stored destination.







==================================================



1. REDIRECT BEHAVIOUR



==================================================







When someone visits:







https://go.dailyincomesteps.com/ght1







they should be redirected immediately to:







https://www.trafficignition.com/lp3/darrenlaverick/Herculist-Test1







Use a proper HTTP redirect.







Prefer a server-side redirect if supported cleanly by the current architecture.







Do not load a visible intermediate page unless technically required.







The redirect should be:







- fast



- mobile friendly



- reliable



- compatible with email links



- compatible with advertising platforms







==================================================



2. SIMPLE TRACKING



==================================================







Record a simple click count for each redirect.







For each visit record only what is reasonably needed for aggregate tracking.







Minimum:







- redirect/link ID



- timestamp







Optionally record safe aggregate metadata already available through the application infrastructure.







Do NOT build invasive visitor tracking.







The main metric required now is:







CLICK COUNT







==================================================



3. REDIRECT DATA MODEL



==================================================







Use a small extensible structure.







Each redirect should support:







- slug



- label



- destination URL



- click count



- active/inactive



- created date



- updated date







If useful without overbuilding, also allow:







- offer/campaign label



- traffic source



- test number







For this first link:







Slug:



ght1







Label:



GHT1 — HercuList Test 1







Traffic Source:



HercuList







Test:



1







==================================================



4. SIMPLE ADMIN MANAGEMENT



==================================================







Add a lightweight admin area in the Daily Income Steps project for these links.







Something simple such as:







Tracking Links







Show:







Short Link



Label



Destination



Clicks



Status







Actions:







- Create



- Edit



- Copy Link



- Enable/Disable







Do not build a complex analytics platform.







==================================================



5. FUTURE NAMING



==================================================







The system must allow simple sequential campaign slugs such as:







Gotta Have Traffic:



ght1



ght2



ght3



ght4







Traffic Ignition:



ti1



ti2



ti3







Daily Income Method:



dim1



dim2



dim3







Do not hard-code these categories.







The slug field should remain flexible.







==================================================



6. CUSTOM SUBDOMAIN



==================================================







The intended public domain is:







go.dailyincomesteps.com







Inspect the current project/domain configuration.







If Lovable can connect this subdomain directly, configure the application so the redirect routes are ready for it.







If DNS configuration must be completed outside Lovable:







DO NOT invent DNS values.







Report exactly what DNS/custom-domain configuration Lovable requires after the code is ready.







The redirect functionality should also remain testable on the project's existing Lovable/custom domain before DNS is completed.







==================================================



7. LINK SAFETY



==================================================







Validate destination URLs as HTTP/HTTPS URLs.







Do not create an unrestricted public redirect creation endpoint.







Only authenticated/admin users should be able to create or modify redirect destinations.







Public visitors only need permission to follow an existing active redirect.







==================================================



8. NO LARGE SYSTEM



==================================================







Do NOT build:







- advanced attribution



- heatmaps



- fingerprinting



- UTM builder



- QR generator



- split testing engine



- detailed visitor profiles



- complex dashboards







We can add those later if needed.







This V1 needs:







CREATE LINK



→ BRANDED URL



→ CLICK COUNT



→ REDIRECT







==================================================



9. LIVE TEST



==================================================







Create and test:







/ti1







Confirm it redirects to:







https://www.trafficignition.com/lp3/darrenlaverick/Herculist-Test1







Verify:







- redirect works on mobile



- destination is unchanged



- click count increments



- Copy Link works



- inactive links do not redirect normally



- no visible intermediate page is shown during normal operation







==================================================



FINAL REPORT



==================================================







Return:







FILES CHANGED







TRACKING LINKS ADMIN







GHT1 CREATED







PUBLIC TEST URL







DESTINATION VERIFIED







REDIRECT TYPE







CLICK TRACKING STATUS







CUSTOM SUBDOMAIN STATUS







DNS ACTION REQUIRED, IF ANY







MOBILE TEST







BUILD / TYPECHECK







Do not create a planning document.







Implement and test the working redirect.  DAILY INCOME STEPS — BRANDED TRACKING LINKS + CAMPAIGN HTML LIBRARY V1



IMPLEMENTATION ONLY — DO NOT CREATE A PLAN.



Build a simple, practical outbound campaign tracking and creative-management area inside the Daily Income Steps project.



The purpose is to let me:



1. create short branded campaign links

2. know exactly which offer and traffic source each link belongs to

3. track clicks

4. store the HTML creative used for each campaign

5. open that HTML with one click

6. copy the complete HTML in one action for pasting into services such as HercuList



Keep this lightweight and easy to use.



==================================================

FIRST LIVE CAMPAIGN

==================================================



Create this existing test:



Slug:

ght1



Public branded URL intended:



https://go.dailyincomesteps.com/ght1



Destination:



https://www.trafficignition.com/lp3/darrenlaverick/Herculist-Test1



Preserve that destination EXACTLY.



Campaign Name:

HercuList Test 1



Offer:

Traffic Ignition



Traffic Source:

HercuList



Test Number:

1



NOTE:



Although the initial slug is `ght1`, the actual destination is Traffic Ignition.



Store the Offer field correctly as:



Traffic Ignition



Do not automatically rename the existing requested slug during this build.



Future naming should normally follow:



Traffic Ignition:

ti1, ti2, ti3...



Gotta Have Traffic:

ght1, ght2, ght3...



Daily Income Method:

dim1, dim2, dim3...



==================================================

1. TRACKING LINKS / CAMPAIGNS LIST

==================================================



Create a clean table/card list showing:



Campaign

Offer

Traffic Source

Test

Short Link

Destination

Clicks

Status

HTML Creative

Actions



Example:



HercuList Test 1

Traffic Ignition

HercuList

Test 1

/ght1

trafficignition.com/...

0 clicks

Active

[HTML Code]



On mobile, convert this into clean stacked cards rather than a wide overflowing table.



==================================================

2. OFFER ORGANISATION

==================================================



Each campaign should have an Offer field.



Examples:



- Traffic Ignition

- Gotta Have Traffic

- Daily Income Method

- Other



Prefer a flexible stored value rather than hard-coding the whole application around these three offers.



Allow filtering by:



Offer

Traffic Source

Status



This will let me quickly see:



All Traffic Ignition campaigns



or



All HercuList campaigns



etc.



==================================================

3. TRAFFIC SOURCE

==================================================



Store a Traffic Source for each campaign.



Examples:



- HercuList

- Facebook

- Traffic Authority

- Safelist

- Email

- Organic

- Other



Keep this flexible.



==================================================

4. BRANDED REDIRECT

==================================================



The public short link must redirect immediately to the stored destination.



For the first test:



/ght1



→



https://www.trafficignition.com/lp3/darrenlaverick/Herculist-Test1



Use a proper fast redirect.



Record the click.



Do not display a visible intermediate page during normal use.



==================================================

5. SIMPLE CLICK TRACKING

==================================================



Maintain:



- total clicks

- last clicked date/time if simple to support



Do not build invasive visitor tracking.



We only need enough data to compare campaign performance.



==================================================

6. HTML CREATIVE FIELD

==================================================



Add an HTML Creative field to every campaign.



This stores the COMPLETE HTML advertisement/content associated with that campaign.



The HTML should remain editable.



Do not convert it into blocks or rewrite it automatically.



Preserve the complete source code exactly.



==================================================

7. HTML CODE ACTION

==================================================



At the end of each campaign row/card include:



HTML Code



When clicked:



open a modal, drawer or large code panel containing the COMPLETE HTML source for that campaign.



The user should be able to:



- view all HTML

- edit HTML

- save HTML

- select/copy the complete HTML



Include a prominent:



COPY ALL HTML



button.



One tap should copy the entire HTML source to the clipboard.



Show a small confirmation such as:



Copied



after successful copying.



==================================================

8. HERCULIST USE CASE

==================================================



This feature is specifically intended to make campaign testing easy.



Example workflow:



Campaign Library

→ Traffic Ignition

→ HercuList Test 1

→ HTML Code

→ Copy All HTML

→ paste directly into HercuList HTML advertising editor



The copied value must be raw usable HTML.



Do not include:

- markdown fences

- explanatory text

- application wrapper code



Only the campaign HTML itself should be copied.



==================================================

9. HTML PREVIEW

==================================================



If safe and straightforward, add:



Preview HTML



This should show how the creative approximately renders.



Keep preview separate from raw code.



Do not let preview execution affect the application itself.



Use appropriate safe isolation/sandboxing for previewed HTML.



If a safe preview requires substantial architecture, report that and leave preview for later.



COPY ALL HTML is the priority.



==================================================

10. CREATE / EDIT CAMPAIGN

==================================================



The simple campaign form should support:



Campaign Name



Offer



Traffic Source



Test Number



Slug



Destination URL



HTML Creative



Status:

Active / Inactive



Do not create a complicated campaign builder.



==================================================

11. DUPLICATE CAMPAIGN

==================================================



Add a simple Duplicate action if easy with the existing architecture.



Example:



Duplicate ti1

→ create ti2



Copy:



- Offer

- Traffic Source

- HTML Creative

- destination if desired



but require/use a new unique slug.



This will make A/B testing subject lines and creatives much faster later.



Do not build a full experimentation engine.



==================================================

12. LINK COPY

==================================================



Alongside HTML Code, include:



Copy Link



This copies the complete branded URL, for example:



https://go.dailyincomesteps.com/ght1



==================================================

13. CUSTOM DOMAIN

==================================================



The intended dedicated domain is:



go.dailyincomesteps.com



Prepare routing for this domain.



If external DNS configuration is required, report the exact next step rather than inventing DNS values.



Until the custom domain is connected, the redirects must still be testable using the project's current working domain.



==================================================

14. DATA MODEL

==================================================



Reuse existing structures if appropriate.



Do not create duplicate tables unnecessarily.



A campaign/tracking record should support at least:



- id

- owner/admin

- campaign_name

- offer

- traffic_source

- test_number

- slug

- destination_url

- html_creative

- click_count

- last_clicked_at

- status

- created_at

- updated_at



Keep the architecture extensible but simple.



==================================================

15. ADMIN SAFETY

==================================================



Only authenticated/admin users may:



- create campaigns

- edit destinations

- edit HTML

- change slugs

- activate/deactivate campaigns



Public visitors can only follow active redirect links.



Validate destination URLs as HTTP/HTTPS.



==================================================

16. DO NOT OVERBUILD

==================================================



Do not build:



- advanced attribution

- full email marketing platform

- email sending

- autoresponder

- drag/drop HTML designer

- heatmaps

- fingerprinting

- complex analytics

- full split-testing engine



The objective is:



CAMPAIGN

→ TRACKING LINK

→ HTML CREATIVE

→ COPY

→ SEND ELSEWHERE

→ MEASURE CLICKS



==================================================

17. MOBILE EXPERIENCE

==================================================



This will be used frequently from a phone.



Ensure:



- campaign cards fit the screen

- no horizontal overflow

- Copy Link is easy to tap

- HTML Code is easy to tap

- code viewer fits mobile

- Copy All HTML is prominent

- long destination URLs wrap safely



==================================================

18. FIRST LIVE TEST

==================================================



Create and verify the first campaign record:



Campaign:

HercuList Test 1



Offer:

Traffic Ignition



Traffic Source:

HercuList



Test:

1



Slug:

ght1



Destination:

https://www.trafficignition.com/lp3/darrenlaverick/Herculist-Test1



Verify:



- campaign appears in list

- correct Offer displayed

- correct traffic source displayed

- short link works

- destination preserved

- click count increments

- HTML Code opens

- HTML can be saved

- Copy All HTML works

- Copy Link works

- mobile layout works



==================================================

FINAL REPORT

==================================================



Return:



CAMPAIGN LIBRARY CREATED



GHT1 REDIRECT STATUS



FIRST CAMPAIGN RECORD



OFFER ORGANISATION



TRAFFIC SOURCE ORGANISATION



CLICK TRACKING



HTML CREATIVE STORAGE



HTML CODE VIEWER



COPY ALL HTML



COPY LINK



HTML PREVIEW STATUS



DUPLICATE CAMPAIGN STATUS



CUSTOM DOMAIN STATUS



DNS ACTION REQUIRED



MOBILE TEST



BUILD / TYPECHECK

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://ignition-brain-campaign.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/274e9cca-50ca-476b-89d5-e7e001e296e4).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
