# Neopets Tampermonkey

Tampermonkey Scripts for Neopets. All of these follow ToS as far as I know, but y'know, use at your own discretion etc etc.

MIT License. Don't use for crimes.

## List of Scripts

### Daily Quest Links

A small QoL improvement. Adds links to the daily quest descriptions that mentions a specific page (e.g. the wheels, fishing vortex, battledome) so you can get there more easily.

### Display Market Price

Shows the market price of items on certain pages with a lot of items. Can also highlight items with prices above a certain threshold. Market price data from [ItemDB](https://itemdb.com.br/).

If you also have my wishlist script, it can also highlight your wishlisted items.

Supported pages:
- Standard Neopets shops
- User shops
- Igloo Garage Sale
- Almost Abandoned Attic
- Money Tree
- Rubbish Dump
- Second-Hand Shoppe
- Inventory
- SDB
- Quick Stock
- Your Shop Stock

On pages that take a long time to load (SDB) you may need to refresh the page if it doesn't populate properly.

#### Todo:
- Create some means of updating the settings without modifying the script directly (will probably keep it simple and just do text areas for JSON dumps)
- Option to not highlight items above the threshold if it's also been tagged with "inflation"

### Lunar Temple Puzzle

Highlights the correct answer to the Lunar Temple Puzzle

### Rubbish Dump Avatar

Highlights the items at the rubbish dump that will get you the avatar. Bonus: Also highlights the two rubbish dump exclusive books (in a different color).

### SDB Check Box

QoL improvement. On changing the quantity, automatically checks the box to include that item in bulk actions.

### Shop of Mystery Highlight Cheapest

Highlights the cheapest available item at Tarla's Shop of Mystery.

#### Todo:
- Move that item to the top of the page so you don't have to scroll

### Shop Till Withdraw All

QoL improvement to make it easier to withdraw everything from your shop till by adding a "Max Amount" button to enter the correct amount into the input.

### Tarla Countdown

On days when Tarla's in her Non-Toolbar Treasures, adds a big countdown showing how long until the next prize. Uses Temporal, so only works on browsers that support that. Optionally also plays a notification alarm sound.

NOTE: You will have to manually enter/update the time into the textbox every day. You can get the time on Neoboards / Discord threads (I'm not sure how these people get the times so no automation there.) For convenience, you can enter a URL to your preferred data source, and the script will create a link to it.

### Wishlist

Allows you to keep a persistent items wishlist. Hit Ctrl(or Command) + Alt + W on any Neopets page to open the list.