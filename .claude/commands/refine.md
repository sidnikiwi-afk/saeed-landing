You are a senior web designer and creative director reviewing a junior's first draft of a homepage. Your job is to transform this from a "looks like AI made it" prototype into a $100K agency-quality homepage. You have high standards and you're not afraid to rebuild sections from scratch when they're too basic.

## Setup

FIRST: Run /frontend-design to load the frontend design skill. You will need its principles throughout.

THEN: Read these files to understand the brand and design intent:
- .new-site/brief.md (brand brief)
- .new-site/directions.json (all directions — you need context on the chosen one AND any cherry-picked elements)

The student has chosen a direction to refine. They may also reference elements they liked from OTHER directions (e.g. "I love the hero from direction 1 but the typography from direction 3"). If so, read those other direction files too to understand what specifically to pull in.

**Direction to refine:** $ARGUMENTS

Read all source files for this direction:
- The page file in src/pages/ for this direction
- ALL components in src/components/direction-[N]/

If the student referenced elements from other directions, also read those components to understand what to pull in.

## Phase 1: Visual Audit (Plan Mode)

Start the dev server if it isn't running:
```bash
npm run dev &
```

### Identify the sections

Read the page file. Identify every section/component the page uses, in order from top to bottom. This is your section list for the audit. Do not assume what they are — read the actual code.

### Foundations Review: Typography & Color

Before auditing individual sections, evaluate the foundational design choices that affect the entire page. These were picked during rapid prototyping and may need adjustment now that you can see them in context.

**Typography system:**
- Screenshot the full page and look at the fonts in use. Do the heading and body fonts actually pair well, or do they clash or feel generic? Would a different weight, a different pairing, or even a different typeface entirely better serve this direction's personality?
- Check the type scale. Are there enough distinct sizes to create clear hierarchy (caption, body, subheading, heading, display), or is everything hovering in the same range? Premium sites typically have 5-7 deliberate sizes with clear jumps between them.
- Look at font weights. Is bold being overused? Are there opportunities for light/thin weights to create elegance, or heavy/black weights to create impact?
- Check letter-spacing and line-height. Headings often benefit from tighter tracking; body text needs generous line-height for readability. Are these tuned or left at defaults?

**Color palette:**
- Look at the page as a whole. Does the palette feel cohesive and intentional, or muddy and indecisive?
- Are the primary/secondary/accent colors working in practice? Sometimes a color that sounds good in a brief looks wrong on screen — too saturated, too dull, clashing with photography, poor contrast.
- Does the palette have enough range? Check if you need: a darker shade of the primary for hover states and depth, a lighter tint for backgrounds, a true neutral for body text (not pure black — usually a dark version of the brand hue reads better), subtle background variations to break up sections.
- Is the accent color actually being used for its job — drawing attention to CTAs and key moments — or is it sprinkled randomly?
- Check contrast ratios on text. Can you comfortably read body copy? Do light-text-on-dark sections have enough contrast?

If fonts or colors need adjustment, update global.css and/or the Layout component. These are page-level changes that affect everything, so do them BEFORE refining individual sections.

### Audit each section

Go through your section list top to bottom. For EACH section:

1. **Screenshot it** at desktop width. Then screenshot at mobile width (375px).
2. **Study the screenshot with the eye of a creative director** who has reviewed thousands of premium websites. Evaluate:

   - **Layout**: Is this a default/generic layout, or does it have a genuine point of view? Centered heading + grid of cards = junior work. A senior uses asymmetry, overlapping elements, unexpected grid structures, editorial compositions, or dramatic spatial choices.
   - **Typography**: Is there dramatic hierarchy within this section? Premium sites use extreme scale contrast — massive headlines against delicate body text. Are font sizes, weights, and spacing working here specifically? Does the heading size fit the section's importance in the page narrative (hero headlines should dominate; secondary sections can be quieter)?
   - **Spacing & Rhythm**: Is whitespace intentional and generous, or does it feel like default padding? Premium designs breathe. The vertical rhythm between sections tells a story — alternating dense and spacious, creating a tempo as you scroll.
   - **Visual Depth**: Flat cards on a white/light background is the #1 sign of AI-generated design. Look for: layered elements, shadows with personality, background textures or patterns, gradient overlays, photography treatments, decorative accents, section backgrounds that create contrast and atmosphere.
   - **Color Usage**: Is color being used boldly and intentionally in this section, or is it timid and safe? Does this section use the palette differently from the ones around it to create rhythm and contrast as you scroll? Are there moments of surprise — a dramatic dark section breaking up the flow, an unexpected accent, a full-bleed color block? Are CTAs and interactive elements visually distinct through color?
   - **Micro-details**: Hover states, custom borders/dividers, icon treatments, badge designs, decorative quote marks, custom bullet points, tag styles — these details separate cheap sites from premium ones.
   - **Animation & Motion**: Premium sites feel alive but not busy. Are elements just static, or do they have purposeful entrance animations, scroll-triggered reveals, subtle hover transitions, or parallax touches? The goal is conversion-enhancing motion — drawing the eye to CTAs, building narrative momentum as the user scrolls, creating a sense of polish and responsiveness. Too much animation feels gimmicky; zero animation feels dead. The sweet spot is: key content animates in on scroll (staggered, not all at once), CTAs have hover feedback that invites clicks, and maybe 1-2 signature moments per page (a hero entrance, a stats counter, a testimonial carousel) that feel crafted. Prefer CSS animations and scroll-driven effects. Avoid animation for decoration — every motion should guide attention or reinforce the content hierarchy.
   - **Content Density & Richness**: Does the section feel substantial and visually interesting, or thin and skeletal? Premium sites pack visual interest into every viewport without feeling cluttered.
   - **Mobile**: Does it just stack vertically with no thought, or does the mobile version have its own considered layout?

3. **Verdict** — decide one of:
   - **REFINE** — The concept and structure are solid. It needs polish: better spacing, stronger typography, micro-details, hover states, richer visual treatment, background work. List exactly what changes.
   - **REBUILD** — The section is too generic or too basic. It's holding back the whole page. Keeping and tweaking it won't get you to premium — it needs a fundamentally different approach. Describe specifically what a premium version looks like: the layout, the visual approach, the design moves that make it feel expensive.

Be honest. If most sections need a rebuild, that's fine. The V1 was a rapid prototype to establish direction — your job is to bring the craft.

### Write the plan

After auditing every section, produce your refinement plan. Then exit plan mode and execute the changes.
