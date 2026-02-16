# AI Video Ads Hub — Research & Product Idea Concept

## What we’re building
A minimal, evidence-driven directory of AI video-ad tools and promo deals, where every claim is backed by a **YouTube timestamp “receipt”** (a link to the exact moment in a video where a creator mentions or demonstrates it).

The directory focuses on:
- **Tools** (with lightweight metadata that is realistically obtainable)
- **Review snippets** (short, attributed, timestamped claims from YouTube)
- **Deals / promo codes** (also timestamped from YouTube sponsor reads)

## Core user problem
Marketers and creators waste time:
- comparing tools via vague marketing pages,
- hunting for working promo codes,
- relying on biased “top lists” without proof.

They want:
- fast shortlists of tools per category,
- confidence that claims are real,
- deals that are likely still valid.

## Target users
Primary:
- performance marketers running short-form video ads
- creators producing TikTok/Reels/Shorts or UGC-style ads

Secondary:
- agencies (media buying + creative)
- small teams exploring AI video tooling

## Unique value proposition
- **Receipts-first discovery**: every review or deal links to a precise timestamp.
- **Minimal + verifiable metadata**: only show attributes we can source from public tool aggregators or YouTube (video metadata, descriptions, transcripts).
- **Error-reporting loop**: lightweight “Report” actions to improve quality without heavy moderation features.

## Key product constraints (discussed)
- Do not invent data; display only what we can obtain from:
  1) tool aggregators (API or parsing public pages), and/or
  2) YouTube video metadata, descriptions, transcripts.
- Keep the UI minimal and consistent; avoid heavy dashboards.
- Strong emphasis on **consistent layout width** and **consistent header** across pages.

## What we considered (ideas and scope choices)
### A) “Full ranking / scoring engine” (not required for MVP)
Pros:
- creates an “objective” feeling leaderboard

Cons:
- requires reliable signals (creator weighting, recency decay, sponsorship adjustment, normalization)
- higher risk of misleading scores if data is sparse or biased

Decision:
- **Defer** for MVP. Start with evidence counts and “last seen” freshness, plus filters.

### B) “Submit tool” portal (excluded)
Pros:
- helps expand coverage

Cons:
- adds moderation, spam, support overhead

Decision:
- **Remove from UI** (no “Submit tool” button anywhere). Can be added later if needed.

### C) “Heavy editorial content / long methodology in primary nav” (excluded)
Pros:
- can build trust

Cons:
- clutters navigation, distracts from core actions

Decision:
- Keep **Methodology** link in **footer only**.

## Competition and positioning
### Tool directories / aggregators
Examples: general “AI tool directories”, review aggregators, marketplace lists.

Strengths:
- huge breadth, many tools indexed

Weaknesses (typical):
- little proof behind claims
- ranking can be opaque or pay-to-play

Positioning:
- narrower scope (AI video ads tools) + **proof-first receipts** + “last seen” freshness.

### Deal / coupon sites
Strengths:
- lots of codes

Weaknesses:
- many expired codes, poor verification
- little context on whether code is real

Positioning:
- deals sourced from **creator sponsorship segments** and linked to **timestamps**.

### YouTube itself (searching manually)
Strengths:
- ground truth exists in videos

Weaknesses:
- time-consuming to extract, compare, and keep up to date

Positioning:
- we do extraction + structuring + browsing UX.

## Strengths / weaknesses
### Strengths
- Trust signal is baked in (timestamp receipts).
- Clear “narrow wedge” market: AI tools used for video ads.
- Can scale data ingestion semi-automatically once pipeline works.

### Weaknesses / risks
- Data quality depends on transcript accuracy and extraction quality.
- YouTube API quotas / transcript access can be limiting.
- Deals expire quickly; requires ongoing freshness checks.
- Some creators are sponsored; receipts prove mention, not necessarily unbiased performance.

## Business model options (discussed at a high level)
1) **Affiliate revenue** (primary early candidate)
   - Outbound links to tools via affiliate/referral programs.
2) **Sponsored placements**
   - Must be clearly labeled to avoid trust damage.
3) **Newsletter / alerts**
   - “Deal alerts” and “new tools seen” weekly summary.
4) **Premium analytics** (later)
   - e.g., “how often a tool sponsors”, “most mentioned tools in last 30 days”.

## “Scoring” / prioritization snapshot
No formal scoring model was finalized in the conversation, but the practical priority implied was:

**MVP priority (highest):**
- Clean directory UX (Tools, Deals, Tool Details with Reviews/Deals tabs)
- Proof via receipts
- Filters and search within lists
- Reporting broken data

**Later:**
- sophisticated rankings (consensus score)
- submission portal
- deep analytics dashboards
