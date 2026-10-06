# Resource Budgets

Every autonomous loop must have bounded:
- retry count;
- candidate count;
- wall-clock budget when measurable;
- external API/tool requests;
- concurrency;
- memory/disk growth;
- benchmark repetitions;
- deployment attempts.

Stop and classify when a budget is reached. Never convert budget exhaustion into an infinite loop.
