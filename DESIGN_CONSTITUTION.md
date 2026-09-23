# Web Design Constitution

## 0. Core Principle

The website should feel **designed**, not generated.

The implementation may be assisted by AI, but the visual identity must remain intentional and consistent.

The agent is an implementer, not the art director.

When uncertain, prefer an existing design pattern from this system over inventing a new one.

---

# 1. Absolutely Forbidden

Do NOT automatically use the following patterns unless explicitly requested:

* Generic SaaS landing pages
* "AI startup" aesthetics
* Purple/blue gradient backgrounds
* Gradient text
* Glassmorphism
* Excessive blur
* Floating glowing blobs
* Giant centered hero sections
* Everything inside rounded cards
* Excessive `rounded-xl` / `rounded-2xl`
* Excessive pill-shaped UI
* Huge "Build faster with AI" style headlines
* Three identical feature cards
* Fake dashboard screenshots
* Decorative meaningless icons
* Excessive use of emojis
* Stock illustrations
* Random abstract 3D shapes
* Excessive drop shadows
* Animations added merely because they look impressive
* Parallax everywhere
* "Bento grid" layouts used without a real information hierarchy
* Introducing a new UI library because it is convenient
* Replacing the design system with default shadcn styling

If a design decision exists only because it is common in AI-generated websites, do not use it.

---

# 2. Design Philosophy

The site should prioritize:

1. Clear information hierarchy
2. Strong typography
3. Intentional spacing
4. Useful visual structure
5. Consistency
6. Personality through small details
7. Content over decoration

The website should look like someone made deliberate design decisions.

Avoid trying to impress the user with visual effects.

A simple component executed consistently is preferable to an elaborate component that does not serve a purpose.

---

# 3. Layout

Use a strong underlying grid.

Prefer:

* asymmetric layouts when appropriate
* intentional alignment
* consistent content widths
* predictable spacing
* clear sections
* meaningful whitespace

Do not center everything by default.

Not every section needs to follow:

```text
        BIG HEADING
     subtitle here

      [ BUTTON ]

 ┌──────┐ ┌──────┐ ┌──────┐
 │ CARD │ │ CARD │ │ CARD │
 └──────┘ └──────┘ └──────┘
```

Use the layout to reflect the content.

If the content is naturally dense, allow it to be dense.

If the content deserves breathing room, give it breathing room.

---

# 4. Typography

Typography is a primary design element.

Do not compensate for weak typography with decoration.

Use a small, deliberate type scale.

Prefer:

* strong headings
* readable body text
* restrained font weights
* clear hierarchy
* consistent line heights

Do not use enormous headings simply because modern landing pages commonly do so.

Do not use multiple unrelated fonts without a clear reason.

Typography should remain recognizable across every site built from this template.

---

# 5. Color

Use a defined palette.

Do not invent colors on the fly.

Every site may customize the palette, but it should still use a coherent token system.

Prefer:

* one primary color
* neutral background
* neutral surface
* primary text
* secondary text
* border
* semantic colors

Accent colors should have a purpose.

Do not use gradients as a substitute for having a color system.

Do not make every element colorful.

---

# 6. Borders, Radius & Surfaces

Default to restrained geometry.

Not everything needs to be rounded.

Use radius based on component purpose.

Prefer:

* subtle radius
* thin borders
* flat surfaces
* restrained shadows

Cards should exist because grouping information is useful, not because cards are fashionable.

A section does not automatically need a card around it.

A button does not automatically need to look like a pill.

---

# 7. Components

Build a small set of reusable primitives.

Examples:

* Button
* Link
* Navigation
* Section
* Container
* Card
* Badge
* Input
* Modal
* Tabs
* Table
* Code block
* Footer

Components should have a consistent visual language.

Before creating a new component, check whether an existing component can be composed to achieve the same result.

Avoid creating five visually different versions of the same component.

---

# 8. Icons

Use one consistent icon family.

Do not mix:

* Lucide
* Font Awesome
* random SVGs
* emoji
* unrelated icon packs

unless there is a specific reason.

Icons should communicate information.

Do not put an icon next to every piece of text simply to make the UI look more sophisticated.

---

# 9. Animation

Animation should communicate state or provide useful feedback.

Good:

* hover transitions
* menu transitions
* page transitions
* expanding/collapsing content
* loading states
* subtle entrance animation

Bad:

* everything floating
* everything fading in
* endless bouncing
* animated gradients
* decorative particles
* excessive parallax

Motion should be subtle enough that removing it would not destroy the usability of the site.

---

# 10. Responsive Design

Mobile is not an afterthought.

Do not simply shrink the desktop layout.

Reconsider:

* information hierarchy
* navigation
* spacing
* grids
* typography
* interaction targets

When necessary, change the layout rather than forcing the desktop layout into a narrow viewport.

---

# 11. Content

Design around real content.

Do not generate filler text merely to make a section look complete.

Do not create sections simply because a template usually contains them.

If the site does not need:

* testimonials
* pricing
* feature grids
* statistics
* FAQ
* newsletter signup

then do not add them.

The content determines the structure.

---

# 12. Site Personality

Each website built from this template may have its own personality.

However, personality should come from:

* typography
* content
* imagery
* color
* layout
* small interaction details

rather than completely replacing the underlying design system.

The template provides the grammar.

The individual website provides the voice.

---

# 13. AI-Specific Rule

Never make a design decision solely because it is a common AI-generated pattern.

Before adding a visual element, ask:

> "What purpose does this serve?"

If the answer is only:

> "It makes the website look modern."

do not add it.

---

# 14. Existing Design Takes Priority

When modifying an existing website:

1. Inspect the existing components.
2. Understand the existing design tokens.
3. Reuse existing components.
4. Extend the system only when necessary.
5. Preserve established visual patterns.

Do not redesign the website merely because a different pattern is easier to generate.

Do not replace an established component with a library default.

---

# 15. The Golden Rule

**Make it look like a website designed by a person with taste, not a website assembled from the top 20 results of "modern website UI".**

When choosing between:

A. the trendy solution

and

B. the simple solution that fits the existing system,

choose B.

---

# Personal Web Design Direction

This is a personal website first and a professional portfolio second.

The website should feel like it belongs to a real person.

It should not feel like:

* a SaaS landing page
* a corporate portfolio template
* a résumé converted into HTML
* an agency website
* a startup homepage
* a collection of generic UI components

The website should communicate personality without becoming difficult to navigate.

---

## The Person Comes First

The visitor should encounter a person, not a list of technologies.

Do not lead with:

> Full-Stack Developer | React | Node.js | TypeScript | AWS

Prefer something that actually sounds like the owner of the website.

Technology can appear naturally throughout the site.

---

## Projects Are Stories, Not Cards

Projects should not simply be:

```text
[ICON]
Project Name

A modern solution for...
React · TypeScript · PostgreSQL

[View Project]
```

Whenever possible, projects should communicate:

* what was being built
* why it was interesting
* what problem was encountered
* what was learned
* unusual technical decisions
* what makes the project worth looking at

The implementation details are part of the personality of the site.

A strange project is allowed to be strange.

---

## Imperfection Is Allowed

Do not polish the personality out of the website.

The site does not need to look like a billion-dollar startup.

Small quirks, technical references, unusual layouts, personal interests, and deliberately unconventional sections are allowed.

The website should feel **authored**, not optimized.

---

## Professional Information Still Matters

The site must remain easy to understand for someone who has never met the owner.

A visitor should be able to quickly discover:

* who the owner is
* what they build
* what they are currently working on
* notable projects
* relevant technical skills
* GitHub / contact information
* résumé, if provided

This information should be integrated naturally rather than turning the site into a résumé.

---

## Personal Interests Are First-Class Content

Personal interests may appear alongside technical work.

Examples:

* rhythm games
* Linux
* hardware
* custom setups
* reverse engineering
* game projects
* experiments
* hobbies

These are not automatically "irrelevant."

They help establish that the website belongs to a particular person.

---

## Avoid Corporate Language

Do not automatically use phrases such as:

* "passionate developer"
* "results-driven"
* "innovative solutions"
* "leveraging cutting-edge technology"
* "transforming ideas into reality"
* "building the future"
* "end-to-end solutions"

Unless the owner actually uses that language.

The writing should sound like a person talking about things they genuinely care about.

---

## The Site May Be Weird

Being memorable is more valuable than being perfectly conventional.

A personal website may contain:

* a terminal-like section
* system information
* interactive project details
* unusual navigation
* subtle references to hobbies
* technical easter eggs
* custom visualizations
* playful microinteractions

However, novelty must never interfere with basic navigation.

The visitor should never have to solve a puzzle to find the contact page.

---

## Recruiter Rule

If a recruiter visits the website:

They should understand the owner within approximately 30 seconds.

They should not necessarily think:

> "This is a perfect professional portfolio."

They should instead think:

> "I know what this person is into, what they build, and what makes them different."

That is the goal.

---

## Final Principle

**This website is not a résumé wearing CSS.**

It is a personal website that happens to contain a résumé.
