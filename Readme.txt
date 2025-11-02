For running of the app, just need to stay in the root file aka "Assist", then "npm start", it will start both frontend and backend together.



-------BELOW ARE THE COMMANDS WORKFLOW YOU USE FOR INTERACTING WITH GITHUB-------

1. Start a branch everytime you can coding a new feature (don't work on "main"):
git checkout -b feature/<insert_name_here>          -- e.g. git checkout -b feature/login_function

2. after you are done coding, commit changes to the branch
git add .
git commit -m "comments"                            -- e.g. git commit -m "added Readme.txt"

3. push/update your branch to GitHub
git push -u origin feature/<insert_name_here>       -- e.g. git push -u origin feature/login_function

4. Go to github, "Create Pull Request", review the changes and click Create, then merge afterwards.


-------DO THIS REGULARLY, E.G. BEFORE YOU START YOUR CODING SESSION FOR THE DAY/AFTER FEW HOURS-------

1. Before you merge your branch with main, pull latest updates from github
git checkout main
git pull origin main

2. Go into your branch again then merge into main
git checkout feature/<insert_name_here>             -- e.g. git checkout feature/login_function 
git merge main






             GitHub Repo
        ---------------------
                 main
                 |
        ---------------------
        |                   |
   feature/login       feature/help-request
        |                   |
  Team Member A        Team Member B
        |                   |
   Local Clone         Local Clone
        |                   |
   Make Changes        Make Changes
   Commit & Push       Commit & Push
        |                   |
      Pull Request (PR) --> main
                 |
               Review & Merge
                 |
               Updated main
                 |
        ---------------------
        |                   |
   Team A Pulls          Team B Pulls
   main updates          main updates
        |                   |
  Merge into feature    Merge into feature
  branch if needed      branch if needed
        |                   |
  Continue working      Continue working
test.