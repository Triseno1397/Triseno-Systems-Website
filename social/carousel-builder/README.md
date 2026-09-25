# Breakdown carousel builder

A single-file tool for Instagram carousel posts that break down a website page by page:
a screenshot in a browser window, with hand-drawn arrows and notes explaining what each part does.

- Slides are 1920 x 1080 (16:9). Instagram shows landscape posts up to 1.91:1, so they post uncropped.
- Open `index.html` in a browser (double-click works; it needs internet once to load the PNG export library).
- Add a screenshot: tap the empty window, drop a file on it, or paste.
- Notes: drag to move. Tap a note to show its handles: the round handle aims the arrow, the diamond bends it.
  The note toolbar switches between a plain curve and a loop, circles the target, flips the bend, or deletes the note.
- Tall, full-page screenshots: drag the image up or down inside the window to pick the part that shows.
- "Edit the words" under each slide holds every line of text, so you can edit on a phone too.
- "Save PNG" exports one slide; "Save all slides" exports the carousel in order (`client-01.png`, `client-02.png`, ...).
- Work is kept in the browser automatically. "Save project file" writes everything, screenshots included, to a
  `.json` you can open again later with "Open project file".

The note text that ships with the La Vida Photo Booth slides is placeholder copy. Edit it to match what the real pages do.
