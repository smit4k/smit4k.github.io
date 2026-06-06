---
title: Creating my own colorscheme
date: 2026-05-04
tags: [neovim, design]
links: [https://github.com/smit4k/shale.nvim]
description:
  "How I created the shale colorscheme, my reasoning behind it and my design
  philosophy"
---

![shale_palette](https://raw.githubusercontent.com/smit4k/shale.nvim/refs/heads/main/palette.png)

I made my own Neovim colorscheme. It's called
[shale](https://github.com/smit4k/shale.nvim), and I'm really happy with how it
turned out.

I've used a lot of colorschemes over the years, and most of them are good in
their own way. Some are colorful and expressive, some are very minimal, and some
try to copy the look of other editors. But I kept running into the same small
problem: I wanted something dark and calm without feeling flat, readable without
being boring, and opinionated without getting in the way of actually writing
code.

That's what shale is trying to be. The palette uses muted, easy-on-the-eyes
colors with enough contrast to make syntax readable for long sessions. I didn't
want a theme that screams at me with its colors and makes it distracting to use
every time I open Neovim. I wanted something quiet, comfortable, and consistent
across the parts of my setup I look at every day.

This post is about how I made shale, what I cared about while designing it, and
the small decisions that shaped the final colorscheme.

## The Colors

I chose to go with a muted colorscheme because I know how hard it is to code for
long periods of time with bright colors in your editor constantly distracting
you and burning your eyes. On the other hand, colorschemes that are too basic
and muted, end up looking dead and hard to even read properly.

I was inspired by shale rocks
![shale rocks](https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEiP1uMJ7L9_udWVHxd06tL1vyM6jL7DVnnvNsRc3bxoHxeG8qyrfXdVDEY6jaBbxYvusf89nQBBElBvHqicyaWvi-yJBTox4r_bS97HbnGImvK1hz01vhI8MkXy2-6ceEJ75KGFDnJj98G3Ejs2gYh2odffWwtN6ydmRBd3vSbV-CTyYbF4BNoa5EGb0sQ/s1467/shales.webp)
For the actual colors. While the colors looked good on their own, they fit
together perfectly providing contrast when necessary as well as immersion when
navigating Neovim without making the editor feel noisy
