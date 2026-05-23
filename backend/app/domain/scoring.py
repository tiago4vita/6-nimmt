from __future__ import annotations


def winner_ids(bones_totals: dict[str, int]) -> list[str]:
    """Lowest bones total wins; ties share victory."""
    if not bones_totals:
        return []
    min_bones = min(bones_totals.values())
    return [player_id for player_id, total in bones_totals.items() if total == min_bones]
