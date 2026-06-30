# Phone Test Script

Use this when the GitHub Pages version is live. Test on a real phone because map, SMS, email, and time controls behave differently from desktop browsers.

## Test Setup

- Use the deployed GitHub Pages URL.
- Test once on iPhone Safari.
- Test once on Android Chrome.
- Test once on desktop Chrome.
- Use one SMS recipient and one email recipient you control.
- Do not use emergency services or public safety contacts during testing.

## Core Flow

- [ ] Open the app from the deployed URL.
- [ ] Tap `Clear plan` if any old draft appears.
- [ ] Enter operator name and phone.
- [ ] Choose an activity.
- [ ] Enter `1` or more people.
- [ ] Enter a Launch Location description.
- [ ] Drop a Launch Location pin.
- [ ] Confirm the Launch Location coordinate link appears.
- [ ] Keep trip shape as `Out and back`.
- [ ] Confirm no separate Pull Out Location field is required.
- [ ] Switch trip shape to `Different pull out`.
- [ ] Confirm the Pull Out Location field appears.
- [ ] Enter a Pull Out Location description.
- [ ] Drop a Pull Out Location pin.
- [ ] Confirm the Pull Out Location coordinate link appears.
- [ ] Enter destination or operating area.
- [ ] Select departure date and time.
- [ ] Select return date and time.
- [ ] Add one SMS contact.
- [ ] Add one email contact.
- [ ] Review generated float plan output.
- [ ] Confirm Launch Location coordinates are clickable.
- [ ] Confirm Pull Out Location coordinates are clickable.
- [ ] Tap `Copy plan` and paste into a notes app.
- [ ] Tap the SMS contact link and confirm the message is prefilled.
- [ ] Tap the email contact link and confirm the email is prefilled.
- [ ] Tap `Set return prompt`.
- [ ] Tap `I'm home safe` and confirm the closeout message is prepared.

## Timing Target

- [ ] First-time user completes the basic send path in under 2 minutes.
- [ ] Repeat user completes the basic send path in under 60 seconds.

## Notes To Capture

- Where did the tester pause?
- Which labels were unclear?
- Which fields felt unnecessary?
- Did SMS or email handoff behave unexpectedly?
- Did map pin selection feel too slow or inaccurate?
- Did the user understand Out and Back vs Different Pull Out Location?
