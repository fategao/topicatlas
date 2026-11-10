# Topic Atlas Skills Loading Lab

## Release decision

Publish a new static learning page for agent developers. The page explains how Codex keeps skill
metadata in context, loads `SKILL.md` on demand, and reads supporting files only when needed.

## Evidence

- The demo uses one recorded Codex turn with provider-reported usage.
- The browser receives a static snapshot and never asks for an API key.
- The run loaded the skill body, one reference file, and one deterministic script.

## Verification plan

Run the content validator, unit tests, component tests, production build, and Playwright checks
before deployment. After deployment, verify the public deep link and its static assets.

## Open issue

The draft currently says the initial skill index costs "about 10k tokens" without naming a source.
