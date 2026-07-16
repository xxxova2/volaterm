# Bloomberg Terminal — Source Reader (organized, not summarized)

| Field | Value |
|-------|--------|
| **Purpose** | Long-form reading copy of public sources about Bloomberg Terminal look, grammar, Launchpad, colors, keys, functions, and desk culture |
| **Product** | VOLATERM research only (inspire density + command language; **do not** clone branding or claim licensed BBG feeds) |
| **Companion** | `docs/BLOOMBERG_VISUAL_RESEARCH.md` (living tokens / deliver matrix) · `docs/ORCHESTRATION_BBG_HOME.md` (orchestration) |
| **Built** | 2026-07-13 (Pass 1 corpus) |
| **Rule for this file** | Material is **reorganized by topic**, not compressed into a short brief. Where a full public page/PDF was obtainable, substantial text is included. Where Reddit/X blocked full thread dumps, posts are quoted as retrieved. |
| **Honesty** | Not “every post on the internet.” Public manuals, official UX essays, library guides, HN threads, X posts with screenshots, and university PDFs. Licensed Terminal content is not dumped. |

---

## How to use this file

1. Read by **topic headings** (TOC below).
2. Each block starts with **Source URL / PDF** and date when known.
3. Images are linked by URL (open in browser); alt text from publishers is kept when available.
4. VOLATERM mapping notes appear only in **§99** at the end (short), so the corpus itself stays source-first.

---

## Table of contents

1. Color, amber-on-black, accessibility (CVD)
2. Launchpad UX philosophy (“revolution within evolution”)
3. Official student Getting Started guide (full extract)
4. Launchpad getting-started (university PDF extract)
5. Tips, tricks & shortcuts (library PDF extract)
6. Keyboard grammar & keys (NYIT libguide extract)
7. Color scheme ops for users (`PDFU COLORS`) — campus guide
8. Function / command lists (NYIT + CFI-style notes + ECO/OMON roles)
9. Hacker News — density vs whitespace culture (thread body)
10. X / Twitter posts & threads (screenshots + captions as retrieved)
11. YouTube / video pointers (titles + public descriptions)
12. Open visual references (image URLs from official essays)
13. Competing “terminal-like” UI chatter (context only)
14. Source index (URLs)
99. VOLATERM pointer (one page — not a substitute for sources)

---


# 1. Color, amber-on-black, accessibility (CVD)


## 1.1 Bloomberg LP — Designing the Terminal for Color Accessibility (2021-10-19)
**URL:** https://www.bloomberg.com/company/stories/designing-the-terminal-for-color-accessibility/
**Also:** https://www.bloomberg.com/ux/2021/10/14/designing-the-terminal-for-color-accessibility/

### Full public article text (as retrieved)

# Designing the Terminal for Color Accessibility

October 19, 2021

We often think we see user interfaces the same way as everyone else. However, for users with color vision deficiencies, certain color combinations can have detrimental effects on their use of the Bloomberg Terminal. We estimate that 20,000 of our users have Color Vision Deficiency (CVD), and we must not overlook their needs as we design and roll out new interfaces.

## What is Color Vision Deficiency?

Some people know it as ‘color blindness,’ but that is actually a misnomer, since people who have CVD aren’t necessarily ‘blind’ to colors. Rather, they have a deficiency in which one or more cone cells in their retinas (the cells that detect colors) have reduced or no sensitivity to specific wavelengths of light (Image 1).

Image 1: A comparison of the same image simulating Normal Vision and Color Vision Deficiency. Left: Colored markers shown with Normal Vision have distinctive hues; Right: The same image simulating CVD shows the markers in less distinctive hues.

Image URL: https://assets.bbhub.io/company/sites/51/2021/10/CVD-1-a.png

The scientific terms are **dichromacy** (a type of color deficiency where one cone cell is completely absent – for example, if the green cone cell is absent, it is called *Deuteranopia*) and **anomalous trichromacy** (a type of color deficiency where one cone cell has a reduced sensitivity to certain wavelengths of light – for example, having reduced sensitivity to green light is called *Deuteranomaly*). These color vision deficiencies can take many forms (Image 2). The most common form of CVD affects the red and green wavelengths of the color spectrum.

This deficiency certainly affects people’s everyday experiences. Imagine not knowing if your clothing matches, accidentally eating unripened (green) bananas, or being unable to tell one sporting team’s jersey from another when watching a game on TV.

Image 2: A comparison of the same image simulating Normal Vision and the three main types of Color Vision Deficiency. Clockwise from Top Left: Normal Vision, Red-Green Confusion, Monochromacy (can’t perceive color at all), and Blue-Yellow Confusion.

Image URL: https://assets.bbhub.io/company/sites/51/2021/10/CVD-2-a.png

There are varying prevalence rates of CVD across ethnicities (due to its genetic component) and genders (with CVD predominantly affecting males). However, even by conservative estimates, 20,000 or more of our Terminal users could have the most common form of CVD, Red-Green.

## Why is this an issue for our product?

In the financial industry, red and green are key visual indicators, because they express positive and negative semantic meanings in Western conventions (Image 3). For example, green generally indicates an “up” market status, while red generally indicates a “down” market status.

Image 3: Example of a Bloomberg Terminal Launchpad screen showing the system’s default color scheme. Red colors are associated with “down” market status and green colors are associated with “up” market status.

Image URL: https://assets.bbhub.io/company/sites/51/2021/10/CVD-3-a.png

**VISUAL NOTE (orchestrator):** Image 3 is a primary public Launchpad still — multi-tile black canvas, green/red % moves, dense tables, heat-style tiles, charts with multi-series colors. This is the core “workspace = monitor grid” reference.

Image 4: Terminal visualization that shows green and red color indicators next to an overlay simulating Deuteranopia. The Deuteranopia simulation exposes that the red and green colors appear very similar in hue, and makes it challenging to quickly parse the two different color indicators.

Image URL: https://assets.bbhub.io/company/sites/51/2021/10/CVD-4-a.png

Software programs can simulate the approximate colors that a person with CVD might see. Using this CVD simulator (as shown in Image 4), we can see what an example from the Terminal looks like from the perspective of a user with Deuteranopia. While there still are individual differences between different people, it’s clear that these reds and greens are difficult for these users to distinguish.

This could potentially have large financial repercussions, when using our system to make a decision to trade millions of dollars of securities could be affected by these important visual indicators.

## What about other products?

Operating systems, such as Microsoft Windows or Apple macOS, have enhanced contrast or increased text legibility support to aid in accessibility. These settings cater to a more general approach in an attempt to cover multiple types of vision deficiencies. Apple iOS also includes a small set of preset colors that can be selected for specific CVD types, but this has disadvantages in that it changes specific colors that are crucial in the financial industry. Because of this, we needed to take a researched approach to make our product more inclusive.

## Our research process

To better understand how to implement CVD themes in the Bloomberg Terminal, we first needed to evaluate the user experience of our clients with CVD.

Once we found clients who had self-reported CVD, our next step was to assess which type of CVD they had, and how mild or severe it was. We did this by administering the Ishihara test for color deficiency, a well-known color differentiation test, over the internet.

Image 5: Example of an Ishihara color test plate. The number "74" should be clearly visible to viewers with Normal Color Vision. Viewers with Deuteranopia or Protanomaly may not see a number at all or they may see a “71”.

Image URL: https://assets.bbhub.io/company/sites/51/2021/10/CVD-5-a.png

It’s important to note that this color differentiation test is not perfect, and that test results can vary from what users initially report. To understand how CVD affects the Terminal user experience, we invited these clients into our usability lab and had them evaluate a series of different Terminal image types (e.g., graph lines, colored text, buttons, bars, and heat maps). Clients’ task performance was measured, in addition to self-reported confidence scores of their performance, and overall preferences. Linear mixed effects model analyses showed statistically significant differences between the different color sets, such that clients were more accurate, reported greater confidence, and preferred the alternative and high contrast color sets compared to the current color set.

We concluded from this study that clients with CVD can distinguish alternative or high contrast colors on the Terminal better than the current color set.

Once we understood that certain color sets affected our clients’ task performance and confidence, we wondered, “Which colors would make the Terminal easier to use for clients with CVD?” To answer this question, we needed to go outside the usability lab and interview clients at their own desks to understand how their perceptions of Terminal colors are influenced by the context of their environments.

We interviewed clients using the same image types we evaluated in the previous study. However, this research differed from the previous study in that we enabled clients to run several alternative and high contrast color sets on functions within their Terminal windows, and to provide feedback on these alternative and high contrast color sets in real-time, and in their actual work environments.

Based on this feedback, we found that clients’ perceptions of Terminal colors were affected by how mild or severe their CVD was. For instance, those who had a milder form of CVD tended to have fewer issues differentiating colors, but did have minor issues with differentiating between thinner red and green lines.

Those who had moderate CVD experienced more difficulties with colored images, particularly those with reds and greens blending together. They also had more difficulty distinguishing between darker colors on dark backgrounds.

Finally, those with severe CVD had issues differentiating between different hues of colors like yellows, purples, pinks – in addition to standard greens and reds.

Image 6: The severity level of CVD results in escalating challenges parsing different types of visual communication with color. For example, Mild CVD complicates interpreting the color of small text and thin lines, Moderate CVD additionally makes darker shades of red and green harder to disambiguate, while Severe CVD encompasses all of the former issues, in addition to muddying the distinction between more hues.

Image URL: https://assets.bbhub.io/company/sites/51/2021/10/CVD-6-a.png

Our research also uncovered that some colors had different meanings in different contexts.

While users with CVD may have trouble distinguishing between different color combinations, their semantic color associations persisted. For example, greens and blues tended to be self-reported as denoting an “up” market status, while reds, yellows, and oranges tended to denote a “down” market status.

## Our solution

Once we gathered these learnings, we knew that our design solutions needed to be:

* Associated with the implicit “semantic” color meanings users were already familiar with
* Brighter and more saturated to aid users who had more severe forms of CVD
* Consistent among the Bloomberg Terminal user base with CVD

Based on these insights, we introduced the following new CVD color schemes for the Bloomberg Terminal.

Users with Deuteranopia now have the option to view their Terminal screens using semantic colors other than reds and greens for positive and negative sentiment.

Image 7: Two accessibility color schemes for Deuteranopia and Protanomaly currently available in {PDFU COLORS } for users to apply to the Terminal.

Image URL: https://assets.bbhub.io/company/sites/51/2021/10/CVD-7-a.png

Based on our research, we chose to stick with a blue and red (“up” market status and “down” market status) CVD color scheme, while at the same time retaining the default Bloomberg amber color for non-semantic information. This color scheme incorporated our research findings, while also retaining the tradition and legacy of other well-known colors associated with the Terminal.

Image 8 (GIF): A demo of changing the Terminal-wide color scheme in the Personal Defaults: Accessibility Color Schemes options of the {PDFU COLORS } function.

Image URL: https://assets.bbhub.io/company/sites/51/2021/10/CVD-8.gif

But, we weren’t done yet! In addition to the initial focus on Deuteranopia, we also implemented a second CVD color scheme specific to Protanomaly, another rare type of CVD.

## {PDFU COLORS <GO>}

To turn on one of these new color schemes, users can change their default color scheme settings using {PDFU COLORS <GO>}. These color schemes are applied immediately after the option is selected and is re-run within the panel window.

To illustrate how these new CVD color schemes might look to a user with this specific deficiency, we’ve demonstrated the effect when we put the default red and green colors side-by-side to the redesigned CVD color scheme and look at them through a CVD simulator.

Image 9 (GIF): An animation comparing our Default Color Scheme to a CVD Color Scheme with a Deuteranopia simulation overlay. This example exposes how the CVD color scheme (right) improved the color accessibility of the “up” and “down” market sentiment compared to the default color scheme (left).

Image URL: https://assets.bbhub.io/company/sites/51/2021/10/CVD-9.gif

Initial feedback on these new color schemes has been positive. Here are a few quotes from some Terminal users:

* “I noticed that there is a deuteranopia colour option in PDFU. This is very helpful for me…”
* “I want to send {PDFU COLORS <GO>} to a colleague…”
* “This is very cool and very helpful…I just made a nice change for myself…”

## There’s even more to look forward to

As is often the case with technological improvements, the work we have done to get us to this point has inspired and enabled us to think about — and to work on — further improvements to the Terminal. We look forward to sharing them with you as they become available.


## 1.2 Ted Merz — Amber on Black (2021-06-26)
**URL:** https://ted-merz.com/2021/06/26/amber-on-black/

### Full post text (as retrieved)

One of the most distinctive aspects of the Bloomberg terminal is the amber-on-black screen display. It started that way for the simple reason that color monitors were rare in the 1980s. Most computer screens were orange or green on black.

Over the years Bloomberg has been criticized for sticking with “old fashioned” colors.

I recently came across a gem of an article from UX Magazine in 2010 that decries the design.

“The Bloomberg Terminal interface looks terrible, but it allows traders and other users to pretend you need to be experienced and knowledgeable to use it.”

I found it hard not to laugh. The whole article is worth reading here:
https://lnkd.in/eDpwsR5

My favorite quotes:

“Bloomberg’s terminal interface will not evolve any time soon … because users will not be satisfied with something simpler and more efficient.”

Bloomberg clients “favor complexity and clutter over efficiency and clarity to sustain a fictive status symbol.”

Mike Bloomberg has argued the amber text on black background has given the company a distinctive look and brand. You could walk onto a trading floor anywhere in the world and spot Bloomberg terminals across the room.

One irony is that since that UX Magazine article was written a number of competitors have adopted similar black screens. The design has evolved into something of a standard for financial platforms.

Image on page: https://ted-merz.com/wp-content/uploads/2021/06/blp-amber-on-black.jpg


## 1.3 John Cabot University libguide — Color Scheme Options
**URL:** https://johncabot.libguides.com/bloomberg/color-scheme

### Guide text (as retrieved)

You can apply a color scheme optimized for color vision deficiency, so you can more easily differentiate between color-coded screen items across the Bloomberg Terminal®.

Note: Optimized color schemes are supported by a limited number of functions at this time. Additionally, some parts of functions (e.g., Buy and Sell buttons) are not yet compatible with optimized colors.

To apply an optimized color scheme:

* Enter **PDFU COLORS <GO>**.
  * The Accessibility Color Schemes screen appears.
* From the sidebar on the left, select your preference:
  * **Deuteranopia**: Optimized for green-red color vision deficiency.
  * **Protanomaly**: Optimized for red-green color vision deficiency.

Hint: Position your mouse over an option in the sidebar to display a preview of the color scheme to the right of the sidebar.

Your color scheme is updated. You must re-run your current functions and reload your Bloomberg Launchpad® view to see the color scheme in effect.

The instructions above are taken from the Bloomberg Professional Services Personal Defaults Help Page®


# 2. Launchpad UX philosophy (“revolution within evolution”)


## 2.1 Bloomberg UX — Relaunching Launchpad (2017-11-10)
**URL:** https://www.bloomberg.com/ux/2017/11/10/relaunching-launchpad-disguising-ux-revolution-within-evolution/

### Full public article text (as retrieved)

# Relaunching Launchpad: Disguising a UX Revolution within an Evolution

#### November 10, 2017

*How, as a UX designer, do you redesign an entire user interface platform without disrupting the workflow of hundreds of thousands of financial professionals?*

When people think of UI design, they often think of what an application looks like. For the Bloomberg UX team, UI design involves not only the visual design, but also the interaction with the application and its UI framework. And for the Bloomberg Professional service, a.k.a. “the Terminal”, any enhancement to that underlying UI framework must be introduced gradually to minimize user disruption.

Why gradually? Bloomberg Professional subscribers rely on the Terminal to access and analyze data they need to make real-time decisions that impact the global financial markets. Any abrupt change to the user interface can dramatically disrupt their workflows and how they do business.

“As our customers’ workflows become more complex, we redesign our applications to accommodate them, but our UI framework, including the widgets, visualizations and other common tools used by all the apps, also needs to evolve. Too slow, and it feels like even a brand new app is stuck in the past. Too fast, and it feels like change is happening without merit,” said Eddie Ishak, the UX Design and Product Team lead for the Terminal Desktop Framework. “A perfect execution of a UI framework enhancement will not just solve a user need, but will seemingly be unchanged from a customer’s perspective.”

So when the team began the process of redesigning the Bloomberg Terminal’s Launchpad, their philosophy of “designing for the user first” was crucial to their multi-step approach.

**Step 1: Prepare to change the tires on a moving car**

Fundamentally, Launchpad is a user-specific arrangement of connected Bloomberg applications laid out across a multi-display desktop, allowing a user to personalize their various workflows and also share these workflows with their colleagues around the globe.

Information overload? That’s kind of the idea. Launchpad’s ability to display an immense amount of “at-a-glance” information is an essential part of Terminal subscribers’ workflows.

One way a user might use the Launchpad “view” shown above is to simultaneously monitor macro markets while also analyzing specific securities. The left side of the screen mostly shows macro market information (e.g., the Global Macro Markets heat map) while the right side of the screen is focused on select securities. Together, these two views provide a broad, comprehensive understanding of how the world is performing while also monitoring specific activity–all at a glance.

The UX team’s job was to improve the way users could customize this interface across different scenarios. However, that couldn’t be done without first updating the underlying technologies used across the system, which was done slowly and methodically to ensure stability along the way.

“With thousands of applications built upon our Launchpad infrastructure, any UX change can potentially disrupt our clients,” said Ishak. “Our continuous challenge is to ensure that no single UX enhancement is too disruptive, especially if that change also rolls back a necessary technology upgrade. Ironically, we often re-implement old quirky Terminal-specific behavior using new technology. This gives us confidence that any UX enhancements that follow will minimally impact our ongoing technology initiatives.”

**Step 2: Do your research so you build *the right thing***

Since Launchpad is used by thousands of subscribers every day, the team needed to understand where it fits into existing user workflows. They conducted field research and data analysis with the User Research and Data Science teams to examine how clients use the interface.

This combination of qualitative and quantitative research makes the Bloomberg UX team’s approach to human-centered design truly unique. After understanding how users were using Launchpad in different contexts during various parts of their day, the team began to unpack insights within the usage data and digital analytics.

A Bloomberg UX researcher observes how an actual Terminal subscriber uses Launchpad in Bloomberg’s state-of-the-art Usability Lab.

One discovery: many subscribers use Launchpad beyond their office desktop. With the increasing use of mobile technology, Launchpad also needed to seamlessly support a user’s workflow anywhere they need to get work done—whether at their large multi-display setup at work, on a laptop at home, or on a large public display in a conference room. Thus, it was critical to remove any barriers between the customer and their data, especially while away from their desk.

“We never design for the sake of design itself,” said Ishak. “If we don’t do the user research, not only will we not solve the user’s actual problems—but we’ll risk breaking things that weren’t broken to begin with.”

**Step 3: Prototype a streamlined workflow**

Armed with the insights from their research, the designers worked closely with their UX prototypers and production engineers to produce a functional prototype for user testing.

“UX designers never work in a vacuum, especially here at Bloomberg,” said Ishak. “Our work is deeply collaborative, so it was crucial that the recent Launchpad technology refresh empower not only our UX designers, but also our product owners and engineers, to design and build a Terminal product that can meet any customer need.”

**Step 4: Test your assumptions to make sure they work**

With the prototype developed, the team recruited customers to both gather feedback on the new behavior and to objectively determine if the new solution met their needs. One by one, customers were prompted to complete a series of tasks within the Bloomberg state-of-the-art Usability Lab. Through this iterative process, the team was able to identify any misguided assumptions and design a solution to meet the actual needs of Terminal users.

A Bloomberg UX designer has a Terminal subscriber test a design prototype for the new Launchpad.

**Some of the most powerful design changes are under the hood**

Making a global change to a product like Launchpad is never simple. It requires deep coordination between the UX team, product leaders, engineering, as well as the salesforce. It is this slow and steady approach both to the design and its rollout that Ishak says makes it so uniquely challenging, yet very effective.

“When it comes to updating the platform, we’ve seen firm evidence that slow and steady wins the race,” said Ishak. “This can be hard for designers. We often want to work on flashy projects and sound the trumpets to show off our work. But when you acknowledge that the users’ needs come first, you understand—at your core—that change can’t occur for its own sake. In the end, Bloomberg’s approach to advancing the platform has always been to disguise the revolution within an evolution.”


# 3. Official student Getting Started guide (full extract)
**PDF:** https://data.bloomberglp.com/professional/sites/10/Getting-Started-Guide-for-Students-English.pdf
**Extract method:** `pdftotext -layout` on 2026-07-13. Below is the **full** text extract (layout-preserving).

```
A Bloomberg Professional Services Offering




Getting started on the
Bloomberg Terminal.
Contents
02 Bloomberg Terminal
06 Functions & securities
09 Navigation
13 Performing analysis
17 Exporting data
20 Bloomberg Market Concepts (BMC)
21 Getting help & learning more
22 Functions
Introduction
For more than 20 years, Bloomberg for Education has been
committed to helping universities and colleges incorporate the
Bloomberg Terminal® into their academic programs to better
prepare students for the global job market.

Universities and colleges around the globe use Bloomberg
to bring the real world of finance into the classroom, providing
students with access to the same information platform used by
leading decision makers in business, finance and government.

The Bloomberg Terminal seamlessly integrates the very
best in data, news and analytics. The Terminal is a 24-hour,
global financial services system that provides transparent
and reliable financial, economic and government information
covering all market sectors. It features company financials,
market data spanning more than 20 years, charts, statistics,
a communications platform and current news reports.

This guide is intended to provide an overview of the
Bloomberg Terminal so you can get started using this
powerful tool.
Getting started on the Bloomberg Terminal.




The Bloomberg Terminal
The Bloomberg keyboard
The red stop keys, green action keys and yellow market sector keys help you access information
quickly and easily.




Helpful keys


                             The Escape or Cancel key allows you to exit the current
                             function and cancels the current activity on the screen.



                             Click on the Help button once to access a help page;
                             click on it twice to access the Help Desk.



                             Enables keyword search of the entire Bloomberg database.




                             The yellow market sector keys enable you to:
                             • Load securities. Example — IBM US <EQUITY> <GO>
                             • Access market sector menus. Example — <CORP> <GO>


                             The Menu key opens a menu of related functions.




                             The <GO> or Enter key executes the command typed
                             in the command line.




                                                                                                 2
Getting started on the Bloomberg Terminal.




The Bloomberg Terminal
Accessing the application
The Bloomberg Terminal delivers news, data and analytics to your desktop. You can access
the application in one of the following ways:




• Double-click the green Bloomberg icon on your computer desktop.

or
• From the Windows Start menu, select START > All Programs > Bloomberg > BLOOMBERG.
  Once you open the application, the following Bloomberg panel (“window”) appears
  on your desktop.




Note — If you have problems locating the application on the computer, consult your Information Technology
department for guidance on installation and configuration.




                                                                                                            3
Getting started on the Bloomberg Terminal.




The Bloomberg Terminal
Logging in
Once you open the Bloomberg Terminal application, you must log in with a login name
and password.
• Click on one of the Bloomberg panels.
• Press the green <Enter/GO> key on the keyboard. The login screen appears, including
  the yellow highlighted Login Name and Password fields as shown below.
• You will be prompted to create a login name and password when logging in for the first time.
• Press <GO>.
Up to four Bloomberg panels or windows appear on your computer desktop with default
“wake-up” screens.




                                                                                                  4
Getting started on the Bloomberg Terminal.




The Bloomberg Terminal
Bloomberg panels
When you first log in to Bloomberg, up to four Bloomberg panels appear. The panels
are independent workspaces that enable you to multi-task within the Bloomberg system.
You can move from one panel to another using the blue <PANEL> key on the keyboard
or by clicking on the specific panel you want from the Windows taskbar.


                                                                                              1
                                                                                    2
                                                                                          3




The four Bloomberg panels enable you to work with multiple functions simultaneously. As shown
above, each panel is divided into three main sections:
1. Toolbar — The left side of the toolbar includes the menu tab and a drop-down list of recently
    loaded securities, with the current loaded security visible. The right side features icons to help
    you perform key tasks, including exporting data, viewing favorite places and securities, accessing
    Help and adjusting your defaults and display.
2. Command line — Here you enter commands for functions and securities. You can also perform
    a keyword search for securities and functions from the command line. This Autocomplete feature
    makes the Bloomberg Terminal entirely discoverable from the command line.
3. Function area — Here you will see the actual function content displayed.




                                                                                                         5
Getting started on the Bloomberg Terminal.




Functions & securities
About functions
Functions are unique Bloomberg applications that provide analysis and information on securities,
sectors, regions and more.
Each function is accessed by typing in its unique mnemonic (a short, memorable name) and then
pressing the <GO> key.

Example — WEI is the mnemonic for the World Equity Indices analysis function. To access this
function, enter WEI <GO>. The mnemonic for the function in your selected window is always
displayed in the toolbar.

                                                                                                      1. Function mnemonic.
                            1




Types of functions                                                 Using functions
There are two types of functions:                                  There are two main ways to run functions, depending
                                                                   on whether or not you know the function mnemonic.
• Non-security functions provide information or analysis on
  an entire market sector and do not require a loaded security.    If you know the function mnemonic:
	Example — WEI is a non-security function because it              • Enter the function mnemonic in the command line.
  provides information for dozens of equity indices on             • Press the <GO> key.
  one screen. You can run WEI without loading a security
                                                                   • The function runs on the active Bloomberg panel.
  by loading WEI <GO> as shown above.
                                                                     Example — In the command line, enter WEI <GO>.
• Security-specific functions analyze a loaded security.
	Example — GP (Graph Price) is a security-specific function       If you don’t know the function mnemonic:
  because you must specify a security before graphing its
  price. You must load a security to run the GP function:          • Type a keyword for the information you want in the
  IBM US <EQUITY> GP <GO>.                                           command line. (As you type, Autocomplete provides
                                                                     a list of suggested functions.)
                                                                   • Select the function you want to run from the list.
                                                                   • The function runs on the active Bloomberg panel.
                                                                     Example — You want to find a function that analyzes inflation.




                                                                                                                                      6
Getting started on the Bloomberg Terminal.




Functions & securities
Working with securities

                                                                                                                       1. Keyword in Command line.

           1                                                                                                           2. Function mnemonic.
                                                                                                                       3. Function title.



           2                                                                    3




Note — If you are running a security-specific function, the security you want to analyze must be loaded before you
run the function (covered in the next section).



About securities
Securities are financial instruments — like stocks and bonds —                      The security appears as the loaded security in the active
that you can analyze with Bloomberg functions. Once you have                        panel’s toolbar.
loaded a security on a panel, it appears in the loaded security
                                                                                    Example — Using Ford Motor Company, enter
field on the panel’s toolbar. You can run a series of functions
                                                                                    F <EQUITY> <GO>.
to analyze the loaded security.

                                                                                    If you know one of the widely used identification numbers
                                                                                    for a security (e.g., CUSIP, ISIN, BBGID):
Note — The loaded security remains the active security on the panel until you
load a different security.                                                          • Enter the security identification number in the command line.
                                                                                    • Press the yellow market sector key corresponding to the
Loading securities                                                                    security type (Corp, Muni, Equity, etc.).

There are three main ways to load a security — depending on                         • Press the <GO> key.
whether or not you know the security’s ticker symbol or identifier.                 The security appears as the loaded security in the active panel’s
                                                                                    toolbar and a categorized menu of security-specific analysis
If you know the ticker symbol for the security you want to load:
                                                                                    functions appears.
• Enter the ticker symbol in the command line.
                                                                                    Example — Using the CUSIP for Wal-Mart Stores Inc., enter
• Press the yellow market sector key corresponding                                 931142DD2 <CORP> <GO>.
  to the security type (Corp, Muni, Equity, etc.).
• Press the <GO> key.


                                                                                                                                                        7
Getting started on the Bloomberg Terminal.




Functions & securities
If you don’t know the ticker or any other identification number for the security you want to load, follow the steps below:
• In the command line, start typing a keyword for the financial     Hint — The more information you enter, the more refined
  instrument you want to analyze.                                    the list becomes. If you know the type of security you are
As you type, Autocomplete provides a list of suggested securities.   looking for, press the matching yellow market sector key
                                                                     to update the results.
• Select the security you want to load from the list.
The security appears as the loaded security in the active panel’s
toolbar and a categorized menu of security-specific analysis
functions appears.

                                                                                                       1. Keyword.
                                                                                                       2. Market sector (yellow key).
   1       2
                                                                                                       3. Security appears
                                                3
                                                                                                          in Autocomplete.




                                                                                                                                        8
Getting started on the Bloomberg Terminal.




Navigation
Basic search (autocomplete)
Bloomberg’s intelligent Autocomplete search makes it easy to find the security or function you want.
• Type a term in the command line at the top of the active panel.
As you type, Autocomplete displays a list of suggested functions and securities.
• From the list, pick a function to run or a security to load.
The panel updates with the security or function you have selected.

                                                                                                       1. Autocomplete
                                                                                                           suggested listings.
              1
                                                                                                       2. Click to select a
                       2                                                                                  suggested function.




                                                                                                                                 9
Getting started on the Bloomberg Terminal.




Navigation
Full search
If you can’t find what you’re looking for with a basic search (Autocomplete), you can use
the comprehensive Help Search (HL) function. HL allows you to search by keyword across
all categories of information, including functions, securities, companies and people.
HL groups results by category and relevance.
• Enter a search term in the command line at the top of the active panel.
• Press the <SEARCH> key on the keyboard. HL appears with a categorized list of matches.
• Select the appropriate match from the featured search results section of the screen.
  or
  Select a category from the left sidebar to display full category results.




 Search



HL search results




                                                                                            10
Getting started on the Bloomberg Terminal.




Navigation
Browsing menus
About menus
All Bloomberg functions are organized by menus that are classified by market sector
or product type. Each menu is part of a hierarchy, going from the individual functions
up to the Bloomberg Home menu. You can browse menus to discover more about the
analysis and information the Bloomberg Terminal offers.
Here are some sample paths illustrating the navigation through the menu hierarchy
to individual functions:
• Main Menu > Equities > Analyze FORD MOTOR CO Equity > Company Analysis >
  Financial Analysis > FA
• Main Menu > News & Research > TOP

                                                                                                      1. Related functions menu.
                                                                            1




Accessing menus                                                    Yellow key
There are three ways to access menus:                              To access the menu of functions related to a market sector,
                                                                   press the market sector’s yellow key, then <GO>.
• Menu button
• Menu key                                                         Example — To browse the Equities menu, press
                                                                   <EQUITY> <GO>.
• Yellow key

Menu button & menu key                                             Loading a security
From any function, click the Menu button on the toolbar or         To access the menu for a specific security, simply load the
press the <MENU> key to access a menu of related functions.        security’s ticker or other identifier.
Once you access the menu, click or press the <MENU> key            Example — To access the menu of functions that can be used
again to move up to the next menu in the hierarchy.                to analyze IBM US, enter IBM US <EQUITY> <GO>.




                                                                                                                                   11
Getting started on the Bloomberg Terminal.




Navigation
                                                                                      1. Menu breadcrumbs
                                                                                      2. Cancel
                                                                                      3. Category heading/
                                          1             2
                                                                                         navigation




                                                            3




Menu layout                                          <CANCEL> X
Bloomberg menus are intuitively organized to speed   Click <Cancel> X located in the upper right-hand corner
your search efforts.                                 to close the menu.

Menu breadcrumbs                                     Categories & functions
These show your path in the overall menu hierarchy   Menus organize functions under categories. For category
and enable you to navigate backward and forward.     headings followed by “>”, click the category to see the
                                                     next menu in the hierarchy.




                                                                                                               12
Getting started on the Bloomberg Terminal.




Performing analysis
Navigating functions
Bloomberg functions use common screen elements that work in similar ways. Once you learn
about these elements, you can use any function.

                                                                                                    1. Menu bar
                                                            1        3
                                                   2
                                                                                                    2. Amber fields
                                                                                                    3. Number <GO>
                                                                                4
                                                                                                    4. Clickable area




Menu bar                                                          Clickable areas
The red bar at the top of each function includes the function’s   Moving your cursor over a clickable area of the screen shows
title at the right and provides drop-down menus and buttons       one of three types of indicators:
to help you perform key tasks. It may also contain a page
                                                                  • White outline box — Indicates most clickable items,
number indicator.
                                                                    including entries in lists, menus and tables.
                                                                  • Numbered information — Numbers indicate a topical link,
Amber-colored fields
                                                                    enabling quick access to a related page by either clicking
Amber fields indicate areas on the screen that you can change.      the line or entering the number and clicking <GO>.
Amber-colored fields represent editable-form elements, text
                                                                  • Highlighting — Indicates clickable buttons and tabs.
and data input areas and drop-down lists.

                                                                  Keyboard navigation
                                                                  Typing in the number next to an option allows you to quickly
                                                                  navigate within the function using only your keyboard. Many
                                                                  clickable onscreen options are labeled with a Number <GO>.




                                                                                                                                 13
Getting started on the Bloomberg Terminal.




Performing analysis
Stock/Company screening
The Equity Screening (EQS) function enables you to perform sophisticated searches for equity securities.
The following is a quick-start overview for using EQS.

Step 1                                                            Step 3
• Enter EQS <GO>.                                                 Use the Add Criteria section to refine the search with
                                                                  more data-driven criteria, e.g., industry classifications,
The Equity Screening screen appears.
                                                                  fundamentals and ratios.
                                                                  • Click the Fields button.
                                                                  	The Browse Fields window appears with a list of all
                                                                    of the available search criteria fields.
                                                                  • Use the category tree or Search field at the left of the
                                                                    window to identify the specific criteria fields for which
                                                                    you want to set conditions, then click the Select button.
                                                                  	The Add Criteria section of the Build/Edit Screen tab
                                                                    updates with the name of the selected criterion field
                                                                    and additional fields that allow you to set a condition(s)
                                                                    for the selected criterion.
Step 2                                                            • Enter the appropriate condition(s), then press <GO>.
Use the Screening Criteria section to define preliminary          	The Selected Screening Criteria section of the screen
search criteria.                                                    updates with your selected criterion.

• Click a category. A window appears with options
                                                                  Step 4
  for the selected category.
                                                                  Once you have selected all the criteria for the search,
• Drag and drop the appropriate criterion from the
                                                                  click the Results button.
  window so that it appears in the Included Options
  or Excluded Options section of the window.                      The list of companies (equities) matching your search
• Click the Update button.                                        criteria appears.

The criterion for the category is saved and the window            Optional — To explore further options such as saving
closes. The Selected Screening Criteria section at the bottom     the search or exporting the results to Excel, click the red
of the tab updates with your selected criterion and count         Output and Actions toolbar buttons on the Results Page.
of company matches.                                               Note — To access a complete guide to using EQS, press
                                                                  the green <HELP> key once from within the EQS function.




                                                                                                                                 14
Getting started on the Bloomberg Terminal.




Performing analysis
Analyzing a company
In Functions & securities and Navigation, we described the overall logic and navigation
of the Bloomberg Terminal. With that information, the complete breadth and depth of
information on Bloomberg are intuitively and completely discoverable.
This section highlights some of the key company analysis functions available on Bloomberg.

                                                                                                                   1. The DES function analyzes
                        1                                                          2
                                                                                                                       the loaded security.
                                                                                                                   2. DES is the mnemonic for
                                                                                                                      the Description function.




Note — Once you load a security, you can run any number of functions to analyze that security without having
to reenter the security.



Step 1                                                                          Step 2
Load the company you want to analyze.                                           Run the analysis function on the loaded security in one
                                                                                of the following ways:
Example — Enter F US <EQUITY> <GO>.
The company appears in the panel’s toolbar                                      • Click on a category or function from the menu window —
as the loaded security.                                                           or type the mnemonic in the command field — to explore
                                                                                  the full range of analysis options.
                                                                                • Enter the mnemonic for the specific function you want to run,
                                                                                  then press <GO>.
                                                                                The analysis function runs on the loaded security.
                                                                                Example — Enter DES <GO>.




                                                                                                                                                   15
Getting started on the Bloomberg Terminal.




Performing analysis
Mnemonics for popular company analysis functions                   Analyzing an index, bond or currency
DES      Company description and overview                          The Functions & securities and Navigation sections of this
                                                                   guide describe the overall logic and navigation of the
CN       Company news
                                                                   Bloomberg Terminal. With them, the total breadth and depth
HP       Historical price table                                    of information on Bloomberg are completely discoverable.
                                                                   This section highlights the process behind loading different
GP       Historical price chart
                                                                   types of securities and indices and running analysis functions.
GIP      Intraday price chart
                                                                   Load the security or index you want to analyze using the
DVD      Dividend information                                      Autocomplete feature or by entering a ticker and pressing
                                                                   the yellow key.
ERN      Earnings summary
                                                                   Examples
FA       Fundamentals and financial statements
                                                                   SPX <INDEX> <GO>                S&P 500 index
RG       Total return comparison
                                                                   USURTOT <INDEX> <GO> 	Index tracking the
RELS     Capital structure (including bonds and CDS spreads)                              U.S. unemployment rate
G        Technical analysis and/or Multi-security charts           EUR <CURNCY> <GO>               Euro spot
                                                                   F 12 07/16/31 <CORP> <GO> 	Ford Motor Credit bond, 7.45%
Note — To access a function’s Help Page (a comprehensive user                                  coupon, matures July 16, 2031
guide), press the <HELP> key once.                                 CL1 <CMDTY> <GO> 	Front-month NYMEX-traded
For cheatsheets that provide lists of popular analysis functions                      sweet crude oil futures contract
for specific security types, enter BU <GO>, then click the
Access Training Documents link.                                    Run the analysis function on the loaded security in one
                                                                   of the following ways:
                                                                   • Click on a category or function from the menu to explore
                                                                     the full range of analysis options.
                                                                   • Enter the mnemonic for the function you want to run,
                                                                     then press <GO>.
                                                                   For cheatsheets that provide lists of popular analysis functions
                                                                   for specific security types, enter BPS <GO>, then click through
                                                                   to your chosen subject.

                                                                   Note — In some cases, a function that works for one type
                                                                   of security does not work for a different type of security.
                                                                   For example, the Yield Analysis (YA) function allows you
                                                                   to value a bond. If you load an index and try to run the
                                                                   YA function, an error message appears because the
                                                                   analysis and security type are incompatible.




                                                                                                                                     16
Getting started on the Bloomberg Terminal.




Exporting data
The Bloomberg Excel Add-in
Introduction
The Bloomberg Excel Add-in is a powerful tool that delivers Bloomberg data into a Microsoft®
Excel spreadsheet for custom analysis and calculations. All data must remain on a licensed
Bloomberg workstation.
On a computer where the Bloomberg software is active, you can access the Bloomberg Excel
Add-in from the Excel taskbar.




The following is a quick overview of the Bloomberg Excel         Installation of the Add-in
Add-in. For further details on and resources related to the      If you do not see the Bloomberg tab in Excel, you can try
Bloomberg Excel Add-in:                                          to install the Add-in by completing the following steps.
• On the Terminal, enter API <GO>.
• On Excel’s Bloomberg tab, in the Utilities group              Step 1
  at the far right, select Help Contents.                        From the computer’s task bar select
                                                                  Start > All Programs > Bloomberg > Install Excel Add-in.
                                                                 An Installing Bloomberg Excel Add-in dialog box appears.

                                                                 Step 2
                                                                 Click Install. A confirmation dialog box appears.

                                                                 Step 3
                                                                 Close the dialog boxes.

                                                                 Step 4
                                                                 Close Excel.

                                                                 Step 5
                                                                 Open Excel. A Bloomberg tab appears on Excel’s taskbar.

                                                                 Note — If you are unable to install the Add-in, consult your
                                                                 Information Technology team regarding administration rights
                                                                 to the computer.




                                                                                                                                17
Getting started on the Bloomberg Terminal.




Exporting data
Bloomberg Data Wizard                                           Bloomberg formulas in Excel
The easiest way to download data to Excel via the Bloomberg     The Bloomberg Wizards are the easiest way to download data
Excel Add-in is to use one of the Bloomberg Data Wizard         to Excel. The wizards write the Bloomberg API formulas for you.
tools. The wizards provide a guided process to draw data        You can, however, write the formulas yourself if you need more
from Bloomberg into a spreadsheet.                              flexibility than the wizards provide.
                                                                When using any of the formulas, you must specify the security
Step 1                                                          for which you want to retrieve data (Security) and you must
On the Bloomberg tab of the Excel spreadsheet, in the           specify the data item you want to retrieve (Field). The Security
Import group, choose from the following options:                must be represented as (Ticker) (Market Sector), for example,
                                                                IBM US Equity.
• To download most forms of data, click the Real-Time/
   Historical icon.                                             The Field must be represented by its field mnemonic. For
                                                                example, to retrieve the last price for a security, the field
                                                                mnemonic is PX_LAST. The Field Search tool in Excel enables
                                                                you to search for field mnemonics by category or keyword.
                                                                Access the Field Search tool by clicking the Find Fields icon
                                                                on the Bloomberg tab.

The Bloomberg Data Wizard window appears with four
data type options.
• To download values from financial statements and/or          Additional resources for the Bloomberg Excel Add-in
   earnings data, click the Financials/Estimates icon.
                                                                On the Bloomberg Terminal:
                                                                XLTP <GO> 	Library of preformatted Excel
                                                                            spreadsheet templates

The Bloomberg Fundamental Analysis Wizard window                HELP DAPI <GO>	Further detailed information
appears with two data type options.                                             on how to use Excel API
                                                                Within Excel:
Step 2                                                          On the Bloomberg tab, within the Utilities group, click on
Move your mouse over each of the data type icons to             the Help Contents icon to get information and instructions
display a blurb describing the type of data that is available   on using the Excel Add-in to retrieve data.
with each Wizard option.

Step 3
Click on the icon representing the type of data you want
to download.
Step 1 of the Wizard appears.

Step 4
Follow the instructions that appear in the Wizard window
to build your data set.

Once you have completed all of the steps in the Wizard,
the spreadsheet updates with the data you requested.




                                                                                                                                   18
Getting started on the Bloomberg Terminal.




Exporting data
Drag & drop
Some functions display a drag and drop icon in the top right corner of the screen. You can click
on and drag this icon to move securities from the current screen into another application such
as a Microsoft® Excel spreadsheet or a Bloomberg Wizard as part of the Bloomberg Excel Add-in.
Once in a wizard or in a spreadsheet, the tickers appear with Bloomberg market identifiers.

                                                                                                                1. Drag & drop icon

                                                                                                            1




Note — When you use drag and drop, only the securities and/or data from the function’s current page move.
If you have more than one page of securities, you must repeat the drag and drop for each page.



Printing & other export options
There are various ways you can save or export screen shots
from Bloomberg.
To display a list of export options, click on the Export icon
at the top right of a panel’s toolbar.




                                                                                                                                       19
Getting started on the Bloomberg Terminal.




Bloomberg Market Concepts
(BMC)
The best next step to get acquainted with the Bloomberg Terminal is to complete the certification
course: Bloomberg Market Concepts (BMC). BMC is an 8-hour, self-paced e-learning course that
provides a visual introduction to the financial markets and covers more than 70 Terminal functions.
BMC consists of four modules — Economics, Currencies, Fixed Income and Equities — woven
together from Bloomberg data, news, analytics and television. By taking BMC, learners familiarize
themselves with the industry-standard service through four heavily interconnected modules.




By taking BMC, you will:

Learn the language of finance                                       Get Bloomberg on your resume
• Supplement your university learnings with practical              • Receive a certificate of completion after completing BMC.
  knowledge of the markets.                                         • Demonstrate your comfort with the gold standard data platform.
• Familiarize yourself with more than 70 Bloomberg
  Terminal functions.                                               Type BMC into the command line to access the full course.

Discover the inner workings of the markets
• Learn what moves markets.
• Familiarize yourself with key benchmarks that
  professionals monitor.




                                                                                                                                  20
Getting started on the Bloomberg Terminal.




Getting help & learning more
There are a variety of ways to get help using the Bloomberg Terminal.


Bloomberg Help
Enter HELP <GO> for an online user guide to the overall
logic and navigation of the Bloomberg Terminal.


Bloomberg Resource Center
Enter BPS <GO> for the Bloomberg Terminal Resource Center
homepage with links to training resources, including training
documents and video tutorials.


Help pages
Each function has a comprehensive, searchable online user
guide designed to answer common questions and describe
key functionality. From within any function, press <HELP>
once to access that function’s Help Page.


Bloomberg Help Desk
To ask any Bloomberg-related questions, students can start
an email communication with the Bloomberg Help Desk.
Press <HELP> twice to connect.


Additional support
For additional Bloomberg support, press the red
<ESC/CANCEL> key. From the <CANCEL> screen
you’ll find links to:
• Contact the Help Desk
• Contact the Tech Support Team
• Contact Us
  (a list of all local Global Customer Support numbers)
• Your Account Manager and Product Representative
   (simply click on the rep’s name)




                                                                        21
Getting started on the Bloomberg Terminal.




Functions
To see a more comprehensive list of more than 150 targeted functions for students, visit USER <GO>.


Training & navigation                                            Company analysis
BMC	Get Bloomberg certified and learn more about                DES	Access consolidated financial data and fundamental
     the financial markets.                                           background information.
BHL      Visit the Bloomberg Help and Learning Center.           BI	Access industry analyses from Bloomberg Intelligence.
BPS      Locate topic-specific cheatsheets and videos.           BIP	Search for primers on companies, industries or topics.
BU	Search for, enroll in and launch a wide variety              BICO	See a company primer to quickly educate yourself
    of webinars and training resources.                                on a company.
                                                                 QUIC	Leverage QuickTakes to put important news events
Charting & graphs                                                      in context.
GP	Chart securities and technical studies on the                ANR	See analyst recommendations and price targets
    Bloomberg Terminal.                                               for an equity.
HS	Visualize and compare the performance of
    two securities.                                              Currencies
GC	Chart yield curves and see how interest rates                FXFC	Analyze currency price forecasts by contributors.
    move over time.
                                                                 FXCA     Conversion calculation.
GF       Visual analysis of a company’s fundamentals.
                                                                 FXC      Matrix of currency rates.
ECWB	Allows you to standardize and manipulate
                                                                 WCRS	Visually rank and compare current and historical
      economic data.
                                                                       currency rates.

Commodities                                                      WIRA	Track international reserve assets and related
                                                                       growth rates.
BGAS	See pricing for the North American natural
      gas spot market.                                           GMM	Monitor the most significant moves in the
                                                                      global financial markets.
BOIL	Get a full picture of global oil & refined
      products spot pricing.
                                                                 Derivatives
CPF 	Analyze expert forecasts for future
      commodity prices.                                          OMON	See real-time pricing and market data for call
                                                                       and put options.
FDM	Access comprehensive fundamental
     commodities data.                                           OVME	Price and back-test equity derivative products
                                                                       and strategies.
GLCO	Monitor the price movement and performance
      of global commodities.                                     OVML	Structure and price multi-leg FX options for
                                                                       various strategies.
NGAS	Analyze natural gas statistics for the U.S.,
      Canada and Mexico.
WETR	Analyze current, historical and forecasted
      weather trends.




                                                                                                                           22
Getting started on the Bloomberg Terminal.




Functions

Economics                                                          Fixed income
FED     Monitor the activities of the U.S. Federal Reserve bank.   SRCH	Search fixed income securities for trends
                                                                         and trade ideas.
CENB	Access portals to other international central
      bank resources.                                              DDIS	See the maturity distribution of debt for
                                                                         a selected issuer.
ECO	See economic calendars for upcoming industry
     and central bank releases.                                    YAS	Price fixed income securities and calculate yields
                                                                        in one place.
ECST    Monitor economic data from multiple sources.
                                                                   BTMM     Assess a country’s current interest rate environment.
ECFC	See economic forecasts and compare
      regional forecasts.                                          ALLQ	See dealer-contributed prices in real time for
                                                                         corporate bonds.
Equities                                                           DEBT	Determine the holders who are most exposed
                                                                         to a country’s debt.
EQS     Screen for companies to validate your trade ideas.
                                                                   WB	Monitor sovereign bond yields, spreads
FA	Find a company’s financial statements and
                                                                       and performance.
    fundamental data.
                                                                   CRPR	Assess the creditworthiness of an issuer
IPO	Monitor equity offerings to discern competitor
                                                                         or fixed income security.
     financing strategy.
                                                                   CRVF	Search for curves that are relevant to your
CAST    See a debtor’s organization and capital structure.
                                                                         fixed income market analysis.
CACS	See a calendar of corporate actions and events
                                                                   SRSK	Get transparent, quantitative estimates of the
      for a security.
                                                                         1-year default probability of a country’s sovereign
WEI	Get comprehensive market surveillance for                           debt and 5-year CDS spread.
     global equities markets.
RV      Compare a stock to its peers across various metrics.       Mergers & acquisitions
EQRV	Evaluate whether a company is fairly valued relative         BUYP	View M&A buyer profiles to peg possible acquirers
      to peers.                                                          for your assets.

CM	Monitor the key events influencing a company’s                 MA	Track and analyze M&A and arbitrage spread
    stock price.                                                       data in real time.
                                                                   MARB	Monitor real-time merger and acquisition arbitrage
Excel tools                                                              spread data.
XLTP	Access a library of Excel templates for custom               MRGC     Evaluate hypothetical merger scenarios.
      data analysis.
                                                                   PE	Access functions for PE fundraising, screening
DAPI	Learn about retrieving data into Excel using                     and market monitoring.
      Bloomberg API formulas.
FLDS    Locate specific Excel fields for your formulas.




                                                                                                                                    23
Getting started on the Bloomberg Terminal.




Functions
News                                                          Additional resources
TOP	Get the day’s top worldwide news stories in one place.   MSG	Send and manage email communications through
                                                                   your Bloomberg.net email account.
TWTR    Search for Twitter news on Bloomberg.
                                                              MRUL	Manage message rules, including forwarding emails
CN      See top news on a specific company.
                                                                    to your Bloomberg.net email to your personal email
FIRS	Read summarized news stories to track                         account (Gmail, Yahoo, etc.).
      market-moving news.
                                                              JOBS    Search for jobs at companies in the finance industry.
SALT	Set up email alerts for news on the companies
                                                              PEOP	Proprietary people database where you can filter
      you follow.
                                                                    for alumni.
BRIE	Read Bloomberg newsletters on markets, economics
                                                              MVP	Most-viewed people on Bloomberg over the last
      and industries.
                                                                   day, week or month.
                                                              RICH    View the world’s highest-net-worth individuals.
Portfolio management
PRTU	Create, manage, and share your portfolios for
      analysis in PORT.
PORT	Analyze portfolio performance, scenario analysis
      and exposure.
EQBT    Back-test fundamental investment strategies.
UNCL	Create custom classifications to aggregate your
      portfolio or benchmark.
BBU	Upload your portfolios, benchmarks, and custom
     data for analysis in PORT.
CDE	Create custom fields to use your unique data across
     the Bloomberg Terminal.




                                                                                                                          24
About the
Bloomberg
Terminal.
Since 1981, business and financial professionals
have depended on the Bloomberg Terminal®
for the real-time data, news and analytics
they need to make the decisions that matter.
The Terminal provides information on every
asset class — from fixed income to equities,
foreign exchange to commodities, derivatives
to mortgages — all seamlessly integrated with
on-demand multimedia content, extensive
electronic-trading capabilities and a superior
communications network.
Take the next step.           Beijing                                 Hong Kong                                New York                      Singapore
                              +86 10 6649 7500                        +852 2977 6000                           +1 212 318 2000               +65 6212 1000
For additional information,   Dubai                                   London                                   San Francisco                 Sydney
press the <HELP> key twice    +971 4 364 1000                         +44 20 7330 7500                         +1 415 912 2960               +61 2 9777 8600
on the Bloomberg Terminal®.   Frankfurt                               Mumbai                                   São Paulo                     Tokyo
                              +49 69 9204 1210                        +91 22 6120 3600                         +55 11 2395 9000              +81 3 3201 8900

bloomberg.com/professional    The data included in these materials are for illustrative purposes only. ©2017 Bloomberg L.P. 62353 DIG 1117

```


# 4. Launchpad getting-started (university PDF extract)
**PDF:** https://my.lerner.udel.edu/wp-content/uploads/BB-Getting-Started-in-Launchpad.pdf
**Extract method:** `pdftotext -layout` on 2026-07-13. Full extract:

```
            Press the HELP key
            twice for instant
            live assistance.
Help x2




                                                           BLOOMBERG
Frankfurt             New York           Singapore
+49 69 92041 0        +1 212 318 2000    +65 6212 1000
Hong Kong             San Francisco      Sydney



                                                           LAUNCHPAD
+852 2977 6000        +1 415 912 2960    +61 2 9777 8600
London                São Paulo          Tokyo
+44 20 7330 7500      +55 11 3048 4500   +81 3 3201 8900



                                                           GETTING
bloomberg.co
                                                           STARTED
02   Sample Bloomberg
     Launchpad ViewSM




04   Launching Security Monitors

07   Editing Monitor Column Data

09   News Panels

11   Charts

13   Tips and Shortcuts
 SAMPLE BLOOMBERG
 LAUNCHPAD VIEW

 BLOOMBERG LAUNCHPAD consists of multiple news
 and data components that form a desktop display known
 as a BLOOMBERG LAUNCHPAD View. Users have the
 ability to create multiple Views and send them as message
 attachments across the BLOOMBERG PROFESSIONAL®
 service Message system.




02                                                           03
 LAUNCHING
 SECURITY
 MONITORS
                                                                 Note:
 Multiple Monitor components can be launched and
                                                                 There are three ways to enter securities into a monitor:
 customized to track any type of security. Additional features   1. Manual Security Entry
 include color-coding securities and setting price alerts.
                                                                 To enter a list of securities:
                                                                   • Click on the blank yellow cell and enter the ticker and
                                                                     relevant exchange for your first security, e.g. DCX US.
 To Start BLOOMBERG LAUNCHPAD:
                                                                   • Now press the appropriate Yellow Market Sector Key,
 Type BLP <GO>, or press the white                                   for instance, <Equity>.
 ‘LPAD’ button on your Bloomberg
 Keyboard to display the red BLOOMBERG                             • Press the down arrow on your keyboard to repeat the
 LAUNCHPAD toolbar. You are now ready                                process for the second ticker.
 to begin creating a customized display.                           • Once you have completed your manual entry of security
 To Launch a Monitor Component:                                      tickers press <GO> to secure the list in place.

     • Left mouse-click on the red ‘Launch’ button from          Tip:
       the BLOOMBERG LAUNCHPAD toolbar.                          You do not need to press the same Yellow Market Sector
                                                                 Key each time. However, if you are changing sector, say,
     • Select ‘Monitor’ from the drop-down                       from an equity to an index, then you must use the new Yellow
       menu of choices.                                          Key that is appropriate.
     • Select ‘Monitor Manager’.

                                                                 To replace an existing security:
 The Monitor Manager is now displayed.
                                                                   • Double-click on the ticker to open the cell and
     • Select ‘Create New’.                                          over-type with a new ticker.


 A blank Monitor component is now displayed, as shown below.     To insert a new security:
     • Click on the ‘Properties’ tab and enter a name for the      • Position your cursor at the point where you wish
       Monitor. In the example shown, the monitor is called          to include a new ticker. Left-click and from the
       ‘My Ptflo’.                                                   drop-down menu that appears select ‘Insert Security’.




04                                                                                                                             05
                                                                   EDITING MONITOR
                                                                   COLUMN DATA

 2. Importing Securities From Other Sources                        Monitor components can be further customized by
                                                                   selecting up to 14 columns of data from over the
 To load a group of securities instantly from an Index,            6500 data items that are available.
 Portfolio, NW monitor, etc.
     • From the blank Monitor component, click on the
       ‘Properties’ tab in the top right corner.                   To Search and Select Column Data:
     • Select the gray ‘Securities’ tab.                            • From the Monitor component, click on the gray
                                                                      ‘Properties’ tab in the top right corner.
     • Using the drop-down window for ‘Import Securities From’,
       select your chosen source.                                   • Select the gray ‘Columns’ tab.
     • Click on the gray ‘Update’ tab.                              • Click into the yellow ‘Search’ field, enter a keyword(s)
                                                                      and either press <GO> on the keyboard or click on
                                                                      the green <GO> button beside the search field.
                                                                    • From the results generated, click on the item that best
                                                                      fits your data needs. It will automatically be added to
                                                                      your existing data columns on the right.




 3. Importing Securities from Microsoft Excel
 In Excel, highlight the column containing your list of tickers.
 Drag this list into your BLOOMBERG LAUNCHPAD monitor.
 Deleting Single Securities:
     • Position the cursor on the ticker/security to be deleted,
       left mouse-click and select ‘Delete’.
 Deleting Multiple Securities:
     • Press and hold down the <Shift> key on the keyboard.
     • Position the cursor on the first ticker/security to be
       deleted and slide the mouse over any additional
       securities, which highlights them in orange.
     • Left mouse-click and select ’Delete’.
06                                                                                                                               07
                                                              NEWS
                                                              PANELS

 Customize The Title of Column Data                           News-panel components can be customized in a variety
                                                              of ways so that the market-moving stories, research reports
 Customizing how the column data title is displayed on        and multimedia presentations that are important to you
 the monitor can help save space and be easier to read.       are displayed clearly.
 For instance you may prefer ‘Vol instead of ‘Volume’ or
 ‘Impl Vol’ instead of ‘Implied Volatility’.
     • Click on your chosen data field that appears on the    To Launch a News Component:
       right-hand side.
                                                               • Left mouse-click on the red ‘Launch’ button from
     • From the drop-down menu, select ‘Override Title’.         the BLOOMBERG LAUNCHPAD toolbar.
     • In the yellow field enter your replacement title        • Select ‘Media/News’ from the drop-down menu
       and press <GO>.                                           of choices.
                                                               • Select ‘News/Research Panel’.
 This gives you the ability to customize how that heading
 is displayed. For instance, you may prefer ‘Vol’ instead
 of ‘Volume’.                                                 A News component is displayed.


                                                              To Edit a News Component:
                                                               • Click on the gray ‘Properties’ tab.

                                                              The ‘Settings’ screen is now displayed.




 Rearrange The Sequence of Column Data
 Change the order in which your column-data choices
 appear. For instance, if you decide you would like to move
 ‘Volume’ from column position three, to position one:
     • Click and hold the data item you wish to move and
       slide the mouse up or down to the new position.
     • Click on the gray ‘Update’ tab once all column data
       has been selected and positioned.


08                                                                                                                          09
                                                            CHARTS


 The choices available are:                                 Multiple chart components can be launched and
    A. Single Security: Enter your ticker.                  customized for single or multiple securities
                                                            incorporating any number of technical indicators.
    B. All News: Equivalent to NH <GO>.
    C. Custom Filter: Built using PANL <GO>.
    D. News Subject: A news code from NI <GO>.              To Launch a Chart
       Click the gray ‘Find’ button for a complete list.
                                                              • Left mouse-click on the red ‘Launch’ button
    E. News Subject Pair: Two news codes from
                                                                from the BLOOMBERG LAUNCHPAD toolbar.
       NI <GO>. E.g. MNA and EUR to cross
       reference Mergers in Europe Click the gray             • Select ‘Chart’ from the drop-down menu.
       ‘Find’ button for a complete list.
    F. News for a Monitor: Select a previously              The Chart Manager is now displayed, which stores
       created Monitor.                                     all previously created BLOOMBERG LAUNCHPAD
    G. News for EMS View: Select a previously               charts and those created using G <GO>.
       created EMS View.


 Additional News Edit Option:
     • Click on the gray ‘Properties’ tab.
     • Click on the gray ‘Display’ tab.

 It is recommended to select ‘Squeeze headlines to fit
 component’ and ‘View History’ so that you can see
 clearly the entire headline within the component and
 to view historical stories easily.
     • Click on the gray ‘Colors’ tab.

 You can specify up to five different keywords that are
 important to you. Allocate each word a color so that
 any headline featuring that word is highlighted clearly.     • Select ‘Create New’.
                                                            The choices available are:
                                                              • Single security intraday/historical.
                                                              • Multiple security intraday/historical.
                                                              • Two security intraday spread, etc.
                                                              • Market Picture Histogram.




10                                                                                                              11
                                                                   TIPS AND
                                                                   SHORTCUTS

     Enter all your choices on the graph creation template         As BLOOMBERG LAUNCHPAD is continually
     and click on the gray ‘Update’ tab once completed to          enhanced, the list of available components will grow
     display the chart.                                            extensively. Use the ‘Component Finder’ to locate
                                                                   components that may be useful to include in your
                                                                   BLOOMBERG LAUNCHPAD Views.


                                                                   Finding Components
                                                                    • Left mouse-click on the red ‘Find’ button from the
                                                                      BLOOMBERG LAUNCHPAD toolbar.




 Adding Technical Studies:
      • Click on the gray ‘Properties’ tab.                        The Component Finder is now displayed.
      • Click on the gray ‘Studies’ tab.
      • Click on each Technical Study available to apply it
        to your existing basic graph. To customize a specific
        element of any study, for instance to change the default
        RSI period of 14 to 21, left-click on the study once you
        have selected it and select ‘Edit Study Properties’.
      • Click on the gray ‘Update’ tab once completed to
        display the chart including technical studies.




12                                                                                                                         13
 Launching Other Components                                  • Left mouse-click on the red ‘Tools’ button
                                                               from the Bloomberg LAUNCHPAD toolbar.
 In addition to launching components from the toolbar,
                                                             • Select ‘Group Manager’.
 you may also create a BLOOMBERG LAUNCHPAD
 component from almost any function in the traditional       • Select which components you would like to
 BLOOMBERG PROFESSIONAL service environment                    create a link between.
 using the function LLP <GO>.                                • Click on ‘Save’ to store those links as ‘Group 1’.

 Example:
   • BARC LN <Equity> DES <GO> LLP <GO>
     • WEI <GO> LLP <GO>




                                                            Note:
                                                            You can create multiple Groups which
 Linking Components                                         contain different linked components, for example,
                                                            Group 1 may contain linked charts, Group 2 may
 The full power of BLOOMBERG LAUNCHPAD is
 realized when the individual components within your
                                                            be linked news components.
 View are linked together. Using this feature ensures
 that when a ticker code is changed in any one              Display Other Sample BLOOMBERG
 component, either through manual entry or simply
                                                            LAUNCHPAD Views
 drag/drop a security from a monitor into any component,
 all linked components will react and change accordingly.   Display pre-canned sample views by market sector:
                                                             • Left mouse-click on the red ‘Tools’ button from
                                                               the BLOOMBERG LAUNCHPAD toolbar.
                                                             • Select ‘Sample Views’.
                                                             • Enter your criteria to generate a list of sample
                                                               views to choose from.
14                                                                                                                  15
 Customer
 Support



 The outstanding level of customer and product
 support provided by Bloomberg will ensure
 you are always up-to-date with the latest features
 and benefiting from the full value of your Bloomberg
 terminal. The following options are available for your use:


 BREP <GO>
 Display the name of your dedicated Bloomberg
 Account Representative.
 TRAIN <GO>
 A menu of Bloomberg training resources that can help
 you better navigate the BLOOMBERG PROFESSIONAL
 service. View all on-line training manuals, register to attend
 Bloomberg seminars and events, request on-site training,
 or read about new functions and enhancements.
 CERT <GO>
 The Product Certification program has been designed
 to equip financial professionals with the power of the
 BLOOMBERG PROFESSIONAL service. Participate in
 well-structured classes to improve your knowledge and
 proficiency of Bloomberg, optimize your job performance,
 and differentiate yourself from your peers.
 <HELP> <HELP>
 Contact the LIVE 24/7 Global Help Desk to
 send enquiries and receive help in real time.




16
                      Press the <HELP>
                      key twice for instant
Help x2               live assistance.




bloomberg.com



Frankfurt                                       London                                            San Francisco                                    Singapore                                         Tokyo
+49 69 92041 0                                  +44 20 7330 7500                                  +1 415 912 2960                                  +65 6212 1000                                     +81 3 3201 8900
Hong Kong                                       New York                                          São Paulo                                        Sydney
+852 2977 6000                                  +1 212 318 2000                                   +55 11 3048 4500                                 +61 2 9777 8600

BLOOMBERG, BLOOMBERG PROFESSIONAL, BLOOMBERG MARKETS, BLOOMBERG NEWS, BLOOMBERG ANYWHERE, BLOOMBERG TRADEBOOK, BLOOMBERG BONDTRADER, BLOOMBERG TELEVISION,
BLOOMBERG RADIO, BLOOMBERG PRESS and BLOOMBERG.COM are trademarks and service marks of Bloomberg Finance L.P., a Delaware limited partnership, or its subsidiaries. The BLOOMBERG PROFESSIONAL service
(the “BPS”) is owned and distributed locally by Bloomberg Finance L.P. (BFLP) and its subsidiaries in all jurisdictions other than Argentina, Bermuda, China, India, Japan and Korea (the “BLP Countries”). BFLP is a wholly-owned
subsidiary of Bloomberg L.P. (“BLP”). BLP provides BFLP with all global marketing and operational support and service for these products and distributes the BPS either directly or through a non-BFLP subsidiary in the BLP Countries.

```


# 5. Tips, tricks & shortcuts (library PDF extract)
**PDF:** https://www.lib.sfu.ca/system/files/32883/bloomberg_tips_tricks_shortcuts.pdf
**Extract method:** `pdftotext -layout` on 2026-07-13. Full extract:

```
TRICKS, TIPS & SHORTCUTS

Personal Defaults
News Settings
Customization: Toolbar & Macro Buttons
Bloomberg menus
(Security specific functions)

Keyboard Tricks
Personal Monitors:
Launchpad: The ultimate desktop display
E-mail & Communication
Printing
Personal Defaults
Personal default settings are specific to the user login name and not the machine. Therefore
when you set certain parameters, they travel with you wherever you log in.

Choose your default settings using the Bloomberg ‘master’ screen. E.g. 1-Bloomberg




PDF      All default settings
PDFQ     Quick default settings

Switch on 4 Bloomberg screens            PDF <GO> 4 <GO> ‘Workstation Defaults’
                                         2 <GO> ‘Panel Options’
Choose U.S as Equity exchange default
                                  PDF <GO> 2 <GO> ‘Market Sector Preference’
CNDF                              11 <GO> ‘General Defaults’
                                         1 <GO> “Equity Exchange Defaults
Benefit: Each time you enter an equity ticker you don’t have to specify the exchange code each time

                                         PDF <GO> 2 <GO> ‘Market Sector Preference’
Permanent Volume on Graphs               11 <GO> ‘General Defaults’




News Settings

NO       To switch on/off the scrolling news bar at the bottom of the screen

Place cursor over the scrolling blue news panel, right mouse click
1)       Split the news panel into a separate window
2)       Enable a scroll bar


NRC      Set new providers/languages preference

Useful NI Codes
                                                                        Historically
NI READ          Weekly Summary of most read News stories
NI WIN           News ‘exclusive’ to Bloomberg                          NI WIN 6/2/04
NI HOT           HOT news – today & historically
NI WNEWS         Who’s who people news                                 NI WNEWS 5/10/03

66 <GO> Type 66 <GO> from a news story to send as an email attachment
Customization: Toolbar & Marco Buttons
The Bloomberg Toolbar with customized buttons is designed to save you time.
If you use various screens and functions on a daily basis, storing these functions within a macro
button ensure that one simple mouse click will quickly run that command and avoid you having to
remember or manually type in the keystrokes!




Enabling toolbar:
· Right click mouse
· Select Terminal Defaults
· Click on the ‘Display’ tab
9 Check: Show Bloomberg Toolbar
9 Check: Use large buttons

Note: ‘Auto Hide Toolbar in Window’ means toolbar
will only display when the mouse/cursor is moved over
the top line of the screen.



Creating Buttons:
For a reminder of the full instructions, at any time type: ‘Button’ and press   select 1

<Alt> BTo start the process of creating and recording a new macro button.
       Also to send an individual button as an email attachment


Editing the Toolbar Layout

Simply left mouse click twice on the empty grey area of the toolbar where there are no buttons




Sending Toolbar to others:
SNDB            To send your entire toolbar as an email attachment via the message system
Main Menus & Security Specific Functions

When first introduced to the Bloomberg system it is advisable to use the main menus. This helps
the user get a feel for the broad scope of Bloomberg and to clearly see a list of the analytics (and
associated function codes) that are available.
Once a Bloomberg user is more familiar with the various function codes they may simply type
those codes directly onto the screen and access the function instantly (thus saving time and by-
passing the broad menus).

Main Menu example                                  Security Specific example

MSFT US <Equity> <GO>                       MSFT US <Equity> GP <GO>
                                                   This by-passed 2 additional steps: 4 <GO> 1 <GO>

MSFT US <Equity> GP W <GO>
This by-passed 2 additional steps & set graph to weekly


BUD 9 09 <Corp> <GO>                            BUD 9 09 <Corp>YAS <GO>
This by-passed 2 additional steps: 2 <GO> 2 <GO>

BUD 9 09 <<Corp> YAS 120 <GO>
This by-passed 2 additional steps: & set the price to 120


Useful Main Menu examples:

IRSM     Interest Rate & Credit Derivatives       CBMU         Convertible Bonds Menu
HYM      High Yield Menu                          EMKT         Emerging Markets menu
N        News main menu                           DATA         Data Services




Keyboard Tricks

LAST     Type LAST to review the last 8 functions used.
CU       ‘Call Up’. Retrieves the last security/ticker used to the screen

EASY     A list of Bloomberg tips and shortcuts
<Alt> K Display a graphic of the Bloomberg keyboard

               This key appears to the left of the space bar on your keyboard. Combine it with:
               Key + ETo open a new file ‘Explorer’ window
               Key + D       To minimize/restore all windows

         DOCS LATEST KEYBOARD <GO> to download & print a keyboard guide
Monitors & Launchpad
Everything you want in one place
Harness the full power of the BLOOMBERG PROFESSIONAL® service and build your own
interactive workstation using Launchpad. This will give you the ability to pick and choose from
numerous screens and unique Bloomberg analytics to create your own customized desktop
display. Select from multiple pricing monitors, charts, news, quote lines, calendars and analysis
screens to create multiple Launchpad ‘views’.


BLP      To initiate the Launchpad software

From the toolbar that appears, select ‘Tools’
and ‘sample views’ to reveal a selection of
pre-built desktop displays that you can utilize.



Click on ‘Help’ and ‘Download Manual’ to
view the
full user guide. To download the basic
instructions, type: DOCS BEGINNER LAUNCHPAD <GO>.


    Any screen that shows the pushpin symbol in the top right hand corner allows you to
   click on the symbol and drag those securities instantly into a Launchpad monitor and
   an excel spreadsheet!


Useful broad monitors:

MOST     Most active stocks
IM       International monitors for Treasury and money markets
FXC      Foreign Exchange Matrix
BBT      Bloomberg BondTrader
METL     Monitor metal commodities
CECO / EVNT Your own personalized version of ECO.
          Use CECO to build/create and EVNT to display results
E-mail & Communication
In the same was that a scrolling news bar is a choice for Bloomberg screen 1
A scrolling MESSAGE bar is a choice for Bloomberg screen 2

TAP     To switch on/off the scrolling message bar

GRAB To sending a single Bloomberg screen-shot as a message attachment.
     You can also click on the grey ‘Actions’ tab on any screen. File type is a .gif




MSGM Message main menu

<Ins>   Press ‘insert’ from a blank message screen to switch modes
             J Cursor = Insert mode with Text wrap J Cursor =: regular over-type mode n

BMAIL Extensive menu of options for additional message system capabilities
PFM     Personal File Manager: Manages all archived messages, news stories &
        PC files that have been saved or uploaded
IB      Real Time chat with ‘Instant Bloomberg’
IB HELPOpen an instant chat window to communicate in real-time with Bloomberg’s 24 hour
       Global Help desk

HDSK    Your outgoing Help Desk Messages
        Benefit: archived forever so you can easily retrieve Q&A

BBFO    Voice and video conference calls




Printing
              To print current page

6             To print a 6 page document
9             To print a story in DTP format. E.g. If the story is 8 pages on Bloomberg, by using
              9    it will condense to approx 5 pages

PSET          Print defaults (landscape/portrait, change printer etc)
                      Press the <HELP>
                      key twice for instant
Help x2               live assistance.




bloomberg.com



Frankfurt                                       London                                            San Francisco                                    Singapore                                         Tokyo
+49 69 92041 0                                  +44 20 7330 7500                                  +1 415 912 2960                                  +65 6212 1000                                     +81 3 3201 8900
Hong Kong                                       New York                                          São Paulo                                        Sydney
+852 2977 6000                                  +1 212 318 2000                                   +55 11 3048 4500                                 +61 2 9777 8600

BLOOMBERG, BLOOMBERG PROFESSIONAL, BLOOMBERG MARKETS, BLOOMBERG NEWS, BLOOMBERG ANYWHERE, BLOOMBERG TRADEBOOK, BLOOMBERG BONDTRADER, BLOOMBERG TELEVISION,
BLOOMBERG RADIO, BLOOMBERG PRESS and BLOOMBERG.COM are trademarks and service marks of Bloomberg Finance L.P., a Delaware limited partnership, or its subsidiaries. The BLOOMBERG PROFESSIONAL service
(the “BPS”) is owned and distributed locally by Bloomberg Finance L.P. (BFLP) and its subsidiaries in all jurisdictions other than Argentina, Bermuda, China, India, Japan and Korea (the “BLP Countries”). BFLP is a wholly-owned
subsidiary of Bloomberg L.P. (“BLP”). BLP provides BFLP with all global marketing and operational support and service for these products and distributes the BPS either directly or through a non-BFLP subsidiary in the BLP Countries.

```


# 6. Keyboard grammar & keys (NYIT libguide extract)
**URL:** https://libguides.nyit.edu/c.php?g=1054896&p=7662441

### Guide text (as retrieved 2026-07-13)

## The Keyboard: Commands, Shortcuts etc...

**The Bloomberg Terminal is Color Coded:**

**<Green Keys>**: Action Keys

**<Red Keys>**: Stop Keys/Cancel & log off keys – Equivalent to the traditional <Escape> button. Press **<CANCEL>** and enter 1 **<GO>** for Global Customer Support Numbers

**<Yellow>**: Market Sector Keys – Press any of the yellow keys for a main menu for that specific sector. e.g. **<EQUITY>** **<GO>** will bring you to a complete menu of equity related news, data and analytics

**<Blue Keys>** **<PANEL>** Leverage all four Bloomberg Professional Service windows. Press **<PANEL>** to rotate between the windows.

**Basic Main Green Keys:**

**<Cmand>** (The Command) Key: A Recap of the previously used Function appears in the top left each time you press “Command”

**<End/Back>** Key: Press and it will bring you back to the Previous Screen

**<Esc/Cancel>** Key: Press to cancel the current function. It cancels the current activity on the screen

**<Go>** (Enter) Key: Go is the Enter Key. The **<GO>** key is equivalent to the “ENTER” key on a traditional keyboard and is essential to activate each function. Simply press it after you enter a command.

**<Help>** Key: Press once to display the help function & a description of the current function that you are using. The key is an additional method used to find information on the BLOOMBERG PROFESSIONAL service. At the top of the screen, type a keyword(s) associated with your subject of interest, followed by the key

**<Help> <Help>** Key: Press twice to be connected to Bloomberg Support 24/7 Press the key twice to open a “LIVE HELP” chat window. In the orange box type your query and press to send.

**<Menu>** Key: Press to navigate from any function back to a menu of related functions. This is equivalent to the “Back” key to return you to the previous screen.

**<Print>** Key: Press once to print the current page or enter the number of pages you want to print and then hit Print (example 10 pages would be 10 Print)

**Broad Market Perspectives - Useful Short Cuts**

EQUITY TK <GO> Company Name <GO> To find the ticker for a company

TICKER SYMBOL <HELP> <GO> Searching for a company when you know the stock symbol

MAIN <GO> Menus for market sectors, customer support and more

TOP <GO> Display today’s top business and general news headlines

READ <GO> Most read news stories

N <GO> The Main News menu

ECO <GO> Display a calendar of economic releases

IM <GO> Display a menu of treasury/money market and international bond monitors

WEI <GO> Monitor World Equity Indices

WE <GO> Monitor World Government Bonds

FXIP <GO> Foreign Exchange Information Platform

IRSM <GO> Interest Rate and Credit Derivatives

EVTS <GO> Display events and earnings announcements calendar

MOST <GO> Monitor the most active stocks

IBQ <GO> More than 65 Industry Reviews

EQS <GO> Scan the Bloomberg Equity universe to find companies that match your selected criteria

BLP <GO> Bloomberg LaunchPad – The Ultimate, customizable desktop display

MA <GO> Mergers and Acquisitions (M&A) Analysis

YCRV <GO> Yield Curve Analysis

FMCI <GO> Fair Market Curve Indices

FMCV <GO> Forward Curve Analysis

TICKER <EQUITY> SPX <INDEX> <GO> Comparing a stock to the performance of the S&P 500 Index

**Other Short Cuts**

HDSK <GO> to access your previously sent Help Desk inquires and answers

LAST <GO> Will review the last 8 functions used.

EASY <GO> Provides a list of Bloomberg Tips and Shortcuts

**TIPS, TRICKS AND FUN**

TOON <GO> Cartoon of the Day

MUSE <GO> Arts and Culture

DINE <GO> Restaurant search and reviews

POSH <GO> Classified adverts

BSP <GO> Bloomberg Sports Menu

FLY <GO> Flight Schedules

WEAT <GO> Regional Weather Forecasts

EASY <GO> Easy-of-use tips and shortcuts

JOBS <GO> Bloomberg career center

PEOP <GO> People Search

BBXL <GO> Bloomberg data and calculations in Microsoft Excel – download sample spreadsheets

PSET <GO> Printer Settings

EXCH <GO> Real-time exchanges and request form

HDSK <GO> Historical archive of all your Help Desk enquiries and corresponding answers

**COMPANY FINANCIALS**

Ticker Symbol <Equity> CH1 <GO> for a Financial Summary (e.g. GE <Equity> CH1 <GO>)

Ticker Symbol <Equity> CH2 <GO> for Income Statement

Ticker Symbol <Equity> CH3 <GO> for Balance Sheet

Ticker Symbol <Equity> ANR <GO> for Analysis Recommendations

Ticket Symbol <Equity> CN <GO> for news on a Company

Ticker Symbol <Equity> EE <GO> for Earning Estimates

Ticker Symbol <Equity> GP <GO> for a Historical Price Graph with Volume

Ticker Symbol <Equity> HE <GO> for Price/Earnings Ratio Table

Ticker Symbol <Equity> HP <GO> for Historical Price Graph with Volume

Ticker Symbol <Equity> TRA <GO> for Total Return Analysis for an Equity

Ticker Symbol <Equity> DVD <GO> for Company Dividends

**ANALYZING A COMPANY**

If you are already familiar with the ticker of the security, enter:

Ticker <YELLOW KEY> FUNCTION <GO> to bring you to that function.

An Equity (Stock) Example: BUD <EQUITY> DES <GO>: This will give you a company description of the NYSE Traded Company Security Anheuser-Busch InBev SA/NV

A Corporate Bond Example: BUD 9 09 <CORP> DES <GO> : Will give you description of the specific Anheuser-Busch Corp Bond

DES <GO> Descriptive page including a snapshot of fundamental data & management information

BQ <GO> Display price, trade, earnings, relative value data on a single screen

CN <GO> Display all Company News

G <GO> Create Customize Graphs

GPO <GO> Graph historical prices and moving averages

RELS <GO> Related Securities – The Capital Structure

CRPR <GO> Credit Profile – Current and historical credit ratings for an issuer

RV <GO> Relative Value – Perform Customized peer group analysis

ISSD <GO> Display issuer information, capital structure and cash flow breakdown

AGGD <GO> Aggregated Debt – Institutional Exposure to Corporate Debt

COMP <GO> Comparative returns for your chosen security to its benchmark index and its industry group

**EQUITY SPECIFIC**

ANR <GO> Displays analyst recommendations

ANC <GO> Displays analyst coverage

EE <GO> Displays earnings estimates menu

**TOTAL RETURN ANALYSIS (For an Equity/Stock)**

Enter: Ticker Symbol <EQUITY> TRA <GO>

**TOTAL RETURN ANALYSIS (For an Index)**

Enter: Index Symbol <INDEX> TRA <GO>

**HISTORICAL BETA**

Enter: Ticker Symbol <EQUITY> BETA

**BOND SPECIFIC**

YAS <GO> Displays analyst recommendations [guide wording as published]

ALLQ <GO> A liquidity platform of price and yield quotes from contributed sources

**CORPORATE BONDS**

Search by Issuer: Ticker Symbol <CORP> <GO> It will list all the bonds issues by the equity (e.g. GE <CORP> <GO>

**GOVERNMENT BONDS**

Enter: WB <GO> for a listing of benchmark government bonds around the world

To Find US Treasury Bonds directly enter: CT10 <GOVT><GO> for the 10 year bond or CT5 <GOVT><GO> for the 5 year

To Find the 3 Month T-Bill enter: CB3 <GOVT><GO>

For US Generic Bonds enter: USGG5YR <INDEX><GO> for the 5 year or USGG10YR <INDEX> <GO>

**EXCHANGE RATES**

For Exchange Rates by Region enter <CRNCY> TKC <GO>

For World Currency Rates enter <CRNCY>WCR <GO>

For Spot and Forward Rates enter: <CRNCY> FRD <GO>

**BLOOMBERG CUSTOMER SERVICE**

BPRP <GO> Displays the name of your Bloomberg Account Representative

BU <GO> Bloomberg University is your gateway to a variety of Bloomberg training resources

CERT <GO> The Product Certification program

WRAP <GO> Bloomberg’s quarterly newsletter of new products

<HELP> <HELP> Contact the Live 24/7 Global Help Desk

Source: Bloomberg (via NYIT LibGuides)


# 8. Function / command lists (roles commonly taught publicly)

Public teaching materials and CFI-style lists consistently document roles such as:

| Mnemonic (public teaching) | Stated role (public guides) |
|----------------------------|-----------------------------|
| DES | Security / company description snapshot |
| GP / HP | Price graph / history |
| FA | Financial analysis |
| ANR | Analyst recommendations |
| OMON | Option monitor / chain-style screen for underlyings |
| OVDV | Volatility surface / smile analytics (options vol) |
| HIVG | Historical implied vol graphs (role in pro use) |
| OVME | Option valuation / multi-leg style pricing |
| WEI | World equity indices |
| ECO | Economic calendar |
| TOP / N / CN | News |
| YCRV / IRSM | Curves / rates derivatives menus |
| BLP | Launchpad |
| PDF / PDFU / PDFU COLORS | Personal defaults / accessibility colors |
| LAST | Last functions used |
| BBXL | Excel |

**CFI article (list page):** https://corporatefinanceinstitute.com/resources/equities/bloomberg-functions-shortcuts-list/

CFI excerpts commonly cited publicly (paraphrase-safe short defs as published on list pages):

* **DES** — Corporate Description — Consolidated financial information for a specific financial instrument…
* **OMON** — Customizable Option Monitor — Provides real-time pricing, market data, and derived data for exchange-traded call and put options for a selected underlying security in a customizable screen.

**Columbia basic commands (structure):** https://guides.library.columbia.edu/bloomberg/basic  
Public notes include: ENTER/GO activates commands; Cancel to start over; MAIN, DES, OMON patterns for equities.

**NYU popular commands:** https://guides.nyu.edu/bloombergguide/popular-commands  
FFM, LAST, OFF, BPS resource center, etc.

**YouTube (Cutler Center) — Top 10 Functions timestamps (public):**
https://www.youtube.com/watch?v=MaWWOQgAMLY
* 0:00 Intro
* 2:20–4:13 DES
* 4:13–5:43 FA
* 5:43–7:00 EQRV
* 7:00–8:03 DSCO
* 8:03–9:01 ANR


# 9. Hacker News — density vs whitespace culture (thread body)
**Thread context:** comment on “Whitespace killed an enterprise app”
**URL:** https://news.ycombinator.com/item?id=19153875
**Parent discussion:** https://news.ycombinator.com/item?id=19153616

### Comments as retrieved (full comment bodies from the item page)

**mruts (Feb 13, 2019):**
A great example of a really nice information dense app is the Bloomberg terminal. Maybe it’s ugly (a lot of people say this, but I personally don’t think so), but all the right design choices have been made. High Contrast, monospaced fonts, extensive keybindings, absolutely no wasted space. And, most essential, it’s not a web app.

I used to work at a portfolio analytics company who’s explicit goal was: to have all of Wall St use Bloomberg on one screen, and our product on the other.

Our app was probably the anti-thesis to the Bloomberg Terminal in almost everyway: “modern” design, tons of white space, a web app, making you have to log in every 30 minutes for “security”, no keybindings.

I’m sure most of HN have never used the terminal, but let me give an analogy. The Bloomberg Terminal is like using Emacs or Vim, they make you feel powerful, they make you feel like a wizard.

Our app was like google docs, you never felt like you were in direct control of it. You never felt like it was an extension of yourself. Unsurprisingly, even though our app was incredibly useful and provided portfolio analytics that you could only get from excel (our biggest competitor), it, and the company, was largely a failure. Instead of being worth billions, we were capped at a valuation of 200m for over 5 years.

I believe completely that the company’s failure was due to our “modern” white space heavy app.

**zhte415 (Feb 14, 2019):**
> You never felt like it was an extension of yourself.

Not a better phrase to describe a Bloomberg Terminal. Everything is there, mainly data, quick charts, Messenger and with it 'social' (yes, Bloomberg Support do make restaurant recommendations if asked), quick facilitation to sometimes complex questions through these services, handy linking to Excel, and where data quality was questionable a quick response.

I think what Bloomberg did/do was/is listen to their customers. A Bloomberg today is much like when I first touched it 20 years ago, but it isn't. It feels the same, or similar, the screens are vastly larger, does what it has always done, scales. There are no redesigns that stop a user doing what they've done before, yet allow them to do more. It is what is expected and surprises, sometimes frustrates, but a learning curve and pleasure comes from learning.

**mruts (Feb 14, 2019):**
The Terminal is probably the best and greatest app that's ever existed. There's just this ineffable feeling you have when using it.. like all the knowledge in the entire world is available at your fingertips. Using it just feels good, you feel powerful, and in control.

For people that haven't used it, I know it sounds like porn. But it's incredible.

**richardcrossley (Feb 13, 2019):**
I love the Bloomberg Terminal style. I watched one of my users retrieve some product information yesterday, a few key presses and it was there. Much faster than a web application.

The colour scheme also looks good. A black background gives you many more high contrast choices. Try using yellow or cyan on a light background. It seems most of the colours are based on the old 8-bit selection; red, green, blue, cyan, yellow, white and black. Orange seems to have been added as well.

**quietbritishjim (Feb 13, 2019):**
Actually orange is the oldest. The story goes that when the Bloomberg terminal was created in the early 80s all the consoles where monochrome, and the only choices were green or orange (on black in both cases, of course). Everyone else used green so they went with orange to be distinctive.

**masklinn (Feb 13, 2019):**
> The story goes that when the Bloomberg terminal was created in the early 80s all the consoles where monochrome, and the only choices were green or orange (on black in both cases, of course).

It's probably not entirely true given there were dozens of known phosphors, and there were monochrome displays in other colors (e.g. the 1980 Apple Monitor III was available in green and white).

*However* assuming they went with pretty standard equipments green was by far the most common followed by amber. Amber is also somewhat softer on the eyes, which might have been an argument in favour given they'd have folks looking at these displays all day long, especially for charts which would fill the terminal with <color>: green monitors were OK when you had mostly black (text, curses interfaces) but it was way too harsh otherwise.

Our first computer actually had both green and amber displays, the amber display was dedicated for games and the like, anything which would light up a significant fraction of the display at once would go to the smaller amber monitor instead of the larger green one.

**artursapek (Feb 13, 2019):**
People who say Bloomberg is ugly have a very shallow view of what design means. It's the form over function way of seeing things. These are the people Apple markets its products to.

**TeMPOraL (Feb 13, 2019):**
This seems to be the mainstream school of design, no doubt inspired by what Apple and Google are doing.

Myself, I absolutely hate it, because it puts sellability over productivity for end users. I.e. it literally wastes people's time.

**noir_lord (Feb 13, 2019):**
I liked the bloomberg style so much I ripped the fonts out of some Bloomberg software and use them as my terminal font :).

It's an attractive font.

**IshKebab (Feb 13, 2019):**
Actually I was talking to the Bloomberg people at a conference and parts of the terminal *are* web based now.

Also how are monospaced fonts "the right decision"?

**mruts (Feb 13, 2019):**
For the same reason that monospaced fonts are the correct choice for code: so text can line up. If you you’ve used the terminal, it displays structured information really nicely because of this.

Also in regards to the monospaced fonts, you can easily calculate how much space a block of text will take on the screen.

They do have the Bloomberg anywhere portal which is web-based, but the main app isn’t web based.

**TeMPOraL (further on keyboard ergonomics, excerpt):**
Easy but time consuming. I.e. not ergonomic. Also point&click UIs tend to sacrifice composability, whereas keyboard-driven interfaces tend to allow to chain operations and modifiers in a way that makes it ergonomically cover much larger space of possible workflows.

…
Not as much as time wasted if you don’t provide a "faster path" to learn. I'm trying hard to understand, why modern UX designers react to the *possibility* (not even requirement) of users learning like devil to holy water. That is, beyond the obvious reason - pretty but useless software sells better, as you rate looks on first impression, but ergonomics on repeated use (i.e. after sale).

**mruts (on command + display):**
The most powerful form of computing is having the command line for input but also allowing a UI for the display of information.


# 10. X / Twitter posts & threads (as retrieved)

**Note:** Full multi-image educational series often live in image carousels. Captions + media URLs below are what the API returned. Open image URLs to “see” the Terminal/UI.

### @hamptonism — series (high engagement teaching posts)

**Post ID:** 1846935525933891746 · 2024-10-17  
**Text:** Entire Series Breaking Down what the Bloomberg Terminal does:  
**Media:** https://pbs.twimg.com/media/GaGiEcEW0AAR5kD.jpg  
**URL:** https://x.com/hamptonism/status/1846935525933891746  
**Engagement (snapshot):** ~3277 likes, ~308 RTs, ~232k views  

**Post ID:** 1913591885299429568 · 2025-04-19  
**Text:** Entire Series Breaking Down how to use a Bloomberg Terminal:  
**Media:** https://pbs.twimg.com/media/Go5xq_wWYAA1MaS.jpg  
**URL:** https://x.com/hamptonism/status/1913591885299429568  
**Engagement (snapshot):** ~4348 likes, ~370 RTs, ~240k views  

### @LongOnlyLarry — “Opening the Bloomberg terminal” screenshots

**Post ID:** 1881307164050149653 · 2025-01-20  
**Text:** Opening the Bloomberg terminal here>>>>  
**Media:** https://pbs.twimg.com/media/Ghu-5LbWAAA26FR.jpg  
**URL:** https://x.com/LongOnlyLarry/status/1881307164050149653  

**Post ID:** 1944100891310559598 · 2025-07-12  
**Text:** Opening the Bloomberg terminal here>>>  
**Media:** https://pbs.twimg.com/media/GvrVdCgXEAAL5PO.jpg  
**URL:** https://x.com/LongOnlyLarry/status/1944100891310559598  

### Design culture — @usgraphics

**Post ID:** 1617581416308695041 · 2023-01-23  
**Text:** Bloomberg Terminal interface is one of the few remaining examples where customer centricity ranks higher than aesthetic frivolity. This interface has remained largely unchanged for decades.

Kudos to the people that defended against tendency to redesign things internally. Heroes.  
**Media:** https://pbs.twimg.com/media/FnLLL6raUAAEt__.png  
**URL:** https://x.com/usgraphics/status/1617581416308695041  

### Clone / OSS UI chatter (context — not BBG official)

**@quantscience_** 2074524146629833041 — “This guy made a Bloomberg Terminal clone. Then open sourced it (for free).”  
Media: https://pbs.twimg.com/media/HMowt7yXoAAqejA.png  
GitHub mentioned in reply: https://github.com/feremabraz/bloomberg-terminal  

**@DanKornas** 2074732665291391482 — “Finance dashboards don’t need to start from a blank grid. Bloomberg Terminal Clone is a Next.js 15…” (feature list in post body as retrieved)

### Amber / Launchpad as cultural shorthand (recent samples)

**@sinvestor1** (2026-02-27): “What he's showing there, you can get for a few cents on the internet. Apart from the amber-coloured font on a black background, it has nothing to do with the capabilities of a Bloomberg terminal.”

**@WOLF_of_IHSG** (2026-05-24): “Bloomberg terminal udah pasti amber to black juga kan Puk ?”

**@st69lol** (2026-03-01): “Looks like the Bloomberg Terminal Launchpad, also Babylon slop...”

**@loftwah** (2026-07-09): “Figuring out this UI has been quite a challenge. I finally have it all on one screen without scrolling.” + screenshot media https://pbs.twimg.com/media/HM0taT-akAA0VZZ.jpg


# 11. YouTube / video pointers

| Title | URL | Public description notes |
|-------|-----|--------------------------|
| How Bloomberg Terminal UX designers hide complexity | https://www.youtube.com/watch?v=DjvHWVO3XJc | Bloomberg official; Chromium rendering layer; invisible rebuild of functions; ~325k customers mention in description |
| Top 10 Functions to Get Started with the Bloomberg Terminal | https://www.youtube.com/watch?v=MaWWOQgAMLY | Cutler Center; DES, FA, EQRV, DSCO, ANR timestamps |

Transcript snippet (hide complexity, auto captions style):

* “tech that powers our UI we did it invisibly at first rebuilding functions in the new chromium rendering layer…”


# 12. Open visual references (image URLs)

Open these in a browser while reading §1–2:

1. Launchpad default color scheme (official): https://assets.bbhub.io/company/sites/51/2021/10/CVD-3-a.png
2. CVD simulation overlay: https://assets.bbhub.io/company/sites/51/2021/10/CVD-4-a.png
3. Accessibility schemes {PDFU COLORS}: https://assets.bbhub.io/company/sites/51/2021/10/CVD-7-a.png
4. Color scheme change GIF: https://assets.bbhub.io/company/sites/51/2021/10/CVD-8.gif
5. Default vs CVD comparison GIF: https://assets.bbhub.io/company/sites/51/2021/10/CVD-9.gif
6. Amber-on-black photo (Ted Merz): https://ted-merz.com/wp-content/uploads/2021/06/blp-amber-on-black.jpg
7. Keyboard reference image (via NYIT/Bloomberg blog path): https://data.bloomberglp.com/professional/sites/10/2013Starboard_10023431_TV-800x288.jpg
8. Hampton teaching carousel frames (X CDN): https://pbs.twimg.com/media/GaGiEcEW0AAR5kD.jpg · https://pbs.twimg.com/media/Go5xq_wWYAA1MaS.jpg
9. Live desk screenshots (X CDN): https://pbs.twimg.com/media/Ghu-5LbWAAA26FR.jpg · https://pbs.twimg.com/media/GvrVdCgXEAAL5PO.jpg
10. “Customer centricity” still: https://pbs.twimg.com/media/FnLLL6raUAAEt__.png


# 13. Competing “terminal-like” UI chatter (context only)

These are **not** Bloomberg sources. They show how the *aesthetic* is mimicked in public:

* Open-source “Bloomberg Terminal Clone” Next.js repos (see §10)
* Creator/web3 “Bloomberg of X” marketing posts
* Reddit UI design threads referencing “Bloomberg vibe” for dense dashboards (r/UI_Design, r/SaasDevelopers — full thread JSON often blocked by network security from this environment; titles retrieved via search: “Got roasted by a UI designer for my ugly terminal UI”, “A High-Density, Terminal-Inspired Dashboard”)

**Reddit search hits (titles/snippets only — full threads often blocked from this host):**

* r/finance — “Bloomberg changed its layout and color scheme” — snippet: “It's still orange on black. It's more similar to a chrome interface though. It has tabs rather than the hard limit of four separate windows.”
  https://www.reddit.com/r/finance/comments/2tyr33/bloomberg_changed_its_layout_and_color_scheme/
* r/ycombinator — “Why is no one going after the Bloomberg terminal?” — snippet: “I'm sitting in bloomberg terminal now and it's like I've time travelled back to 1998…”
  https://www.reddit.com/r/ycombinator/comments/1e5lumd/why_is_no_one_going_after_the_bloomberg_terminal/
* r/bloomberg — Launchpad on TV, GP UI, API threads (titles only without full body when blocked)


# 14. Source index (URLs)

## Official / semi-official
* https://www.bloomberg.com/company/stories/designing-the-terminal-for-color-accessibility/
* https://www.bloomberg.com/ux/2021/10/14/designing-the-terminal-for-color-accessibility/
* https://www.bloomberg.com/ux/2017/11/10/relaunching-launchpad-disguising-ux-revolution-within-evolution/
* https://www.bloomberg.com/ux/
* https://data.bloomberglp.com/professional/sites/10/Getting-Started-Guide-for-Students-English.pdf
* https://www.youtube.com/watch?v=DjvHWVO3XJc

## University / library
* https://libguides.nyit.edu/c.php?g=1054896&p=7662441
* https://johncabot.libguides.com/bloomberg/color-scheme
* https://guides.library.columbia.edu/bloomberg/basic
* https://guides.nyu.edu/bloombergguide/popular-commands
* https://researchguides.dartmouth.edu/c.php?g=719397&p=5124910
* https://my.lerner.udel.edu/wp-content/uploads/BB-Getting-Started-in-Launchpad.pdf
* https://www.lib.sfu.ca/system/files/32883/bloomberg_tips_tricks_shortcuts.pdf
* https://campusguides.lib.utah.edu/bloomberg

## Industry / blog
* https://ted-merz.com/2021/06/26/amber-on-black/
* https://corporatefinanceinstitute.com/resources/equities/bloomberg-functions-shortcuts-list/

## Community
* https://news.ycombinator.com/item?id=19153875
* https://x.com/hamptonism/status/1846935525933891746
* https://x.com/hamptonism/status/1913591885299429568
* https://x.com/LongOnlyLarry/status/1881307164050149653
* https://x.com/usgraphics/status/1617581416308695041
* https://www.youtube.com/watch?v=MaWWOQgAMLY


# 99. VOLATERM pointer (short — sources above are the point)

* Living research log (tokens, gaps, deliver matrix): `docs/BLOOMBERG_VISUAL_RESEARCH.md`
* Orchestration / Hy3 handoff: `docs/ORCHESTRATION_BBG_HOME.md`
* Shell redesign constraints: `docs/engineering/BLOOMBERG_SHELL_REDESIGN.md`

**Remembered operating model (do not forget):**
* You paste packs → Hy3 implements → you bring report → Grok reviews / next pack.
* Grok does **not** auto-run Hy3.
* Bloomberg mastery = ongoing multi-source visual + grammar research (this file + visual research log).
* Hy3 packs implement slices of that plan; there is no separate “BBG after Hy3” phase.

**Next research passes for this reader (append, don’t overwrite):**
* Pass 2: more OMON/OVDV public stills + transcript dumps from tutorials
* Pass 3: full Reddit thread bodies when unblocked
* Pass 4: Hampton carousel frame-by-frame notes (describe each image after visual open)
