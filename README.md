# Monthly Chore Chart

This is a lightweight React page that helps you manage a monthly rotation of household chores with daily rotations.

## Getting started

1. Install dependencies and launch the lightweight API & static server:
   ```bash
   npm install
   npm start
   ```
   It listens on `http://localhost:53123` by default.
2. Visit the app in your browser. The server persists changes to `config/chore-config.json`, so every client sees the same rotation (copy `config/chore-config.example.json` to `config/chore-config.json` to get started).
3. Click **Open Planner** to slide out the planning drawer, pick the focus month, and edit the people list plus the weekday chores and optional weekend alternates (each line corresponds to the same position in both lists; leave a weekend line blank to reuse the weekday chore).
4. Set the **Rotation Starts On** date, choose whether the rotation moves up or down the list, and select who takes the first chore on day 1; weekend alternates automatically replace their weekday counterparts on Saturdays.
5. Use the display toggle to switch between the wall-style calendar (with Sunday shown as a day off) and the person-by-day table.
6. Above the calendar you’ll find **Show/Hide Stats**, **Export PDF**, and **Print** controls—use them to reveal the sidebar, generate a PDF, or print the condensed layout (printing/export automatically switches to the compact table view).
7. Click **Use Sample Data** to try the tool with example names and tasks.

## License

This project is released under a simple **Home-Use License** (see `LICENSE`). You are free to run,
modify, and share the app for personal, non-commercial use in a home environment. Any commercial
use—including deploying it inside a business or bundling it with a paid service—requires obtaining
permission from the copyright holder.
