# Health score rubric

Four dimensions, 25 points each, 100 in total.

The original skill scored five dimensions at 20 points each. RankScore has no IP or subnet data, so the IP/subnet diversity dimension is removed and the other four carry 25 points each. The original gave no point rules per dimension. The rules below were added in this port so that two runs score the same data in the same way. Compare scores only between runs that used the same rank scale and a similar `max_rows`. When the rank scale is uncertain (`SKILL.md` step 5), the authority dimension is not scored and the total is out of 75.

Give each dimension a one-line note in `PROFILE.md` that names the numbers behind the score.

## Authority (rank) distribution

Use the scaled buckets from step 5. "Low" = share of referring domains in the 0-9 bucket. "Strong" = share at 30 or more.

Rank scale uncertain: do not score this dimension. Write "not scored: rank scale uncertain" and give the percentiles from step 5 in the note.

| Points | Rule |
|---|---|
| 25 | Low at most 40% and Strong at least 15% |
| 18 | Low at most 55% and Strong at least 8% |
| 10 | Low at most 70% |
| 4 | Low above 70% |

Fewer than 10 referring domains: score 5 and say that the profile is too thin for a distribution.

## Anchor diversity

Start at 25. Subtract 4 for each anchor class outside its healthy range (table in `SKILL.md`, Output format). Subtract 5 more if exact-match commercial anchors are above 10%. The minimum is 0.

If fewer than 30 `backlinks[]` rows have anchors, say that the sample is small.

## Growth trajectory

From the monthly new referring domains (step 7) and the spike rule there.

| Points | Rule |
|---|---|
| 25 | New domains in at least 4 of the 6 months, no spike |
| 18 | New domains in at least 4 months with one spike, or in exactly 3 months with no spike |
| 10 | New domains in 2 months, or in 3 months with a spike, or two or more spikes |
| 4 | New domains in at most 1 month |

When step 8 found an earlier report: subtract 5 if referring domains fell by more than 10% since that run, or 10 if they fell by more than 25%. The minimum is 0. Do not subtract when step 8 reported losses as not measurable.

When `referringDomains` was cut, the monthly counts are undercounts: say so in the note.

## Toxic candidate ratio

Ratio = toxic candidates (step 9) / referring domains analysed. When the rank scale is uncertain, `low-rank` does not fire, so the ratio can be lower than on a known scale: say so in the note. `insufficient-sample` triggers do not count.

| Points | Ratio |
|---|---|
| 25 | 2% or less |
| 20 | 5% or less |
| 12 | 10% or less |
| 6 | 20% or less |
| 0 | above 20% |
