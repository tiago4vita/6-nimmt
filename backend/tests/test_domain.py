from __future__ import annotations

import random

import pytest

from app.domain.cards import Deck, bones, make_card
from app.domain.game import GamePhase, GameState, PlayerState, deal_config, start_game
from app.domain.resolve import all_submissions_received, resolve_turn
from app.domain.rows import Row, find_best_row, pick_least_bones_row
from app.domain.scoring import winner_ids


class TestBones:
    @pytest.mark.parametrize(
        ("value", "expected"),
        [
            (55, 7),
            (11, 5),
            (22, 5),
            (44, 5),
            (66, 5),
            (10, 3),
            (20, 3),
            (50, 3),
            (100, 3),
            (5, 2),
            (15, 2),
            (25, 2),
            (35, 2),
            (7, 1),
            (13, 1),
            (42, 1),
        ],
    )
    def test_bones_branches(self, value: int, expected: int) -> None:
        assert bones(value) == expected


class TestDealConfig:
    def test_two_player_deal(self) -> None:
        assert deal_config(2) == (10, 10)

    def test_ten_player_deal(self) -> None:
        assert deal_config(10) == (2, 2)

    def test_invalid_player_count(self) -> None:
        with pytest.raises(ValueError, match="between 2 and 10"):
            deal_config(1)


class TestRowPlacement:
    def test_find_best_row_picks_closest_lower_tail(self) -> None:
        rows = [
            Row(cards=[make_card(12)]),
            Row(cards=[make_card(34)]),
            Row(cards=[make_card(56)]),
            Row(cards=[make_card(78)]),
        ]

        assert find_best_row(rows, 40) == 1
        assert find_best_row(rows, 13) == 0
        assert find_best_row(rows, 100) == 3

    def test_find_best_row_returns_none_when_too_low(self) -> None:
        rows = [
            Row(cards=[make_card(20)]),
            Row(cards=[make_card(30)]),
            Row(cards=[make_card(40)]),
            Row(cards=[make_card(50)]),
        ]

        assert find_best_row(rows, 15) is None

    def test_pick_least_bones_row(self) -> None:
        rows = [
            Row(cards=[make_card(55)]),  # 7 bones
            Row(cards=[make_card(7)]),  # 1 bone
            Row(cards=[make_card(11)]),  # 5 bones
            Row(cards=[make_card(10)]),  # 3 bones
        ]

        assert pick_least_bones_row(rows) == 1

    def test_pick_least_bones_row_tie_breaks_on_lowest_tail(self) -> None:
        rows = [
            Row(cards=[make_card(13)]),  # 1 bone, tail 13
            Row(cards=[make_card(7)]),  # 1 bone, tail 7
            Row(cards=[make_card(55)]),
            Row(cards=[make_card(11)]),
        ]

        assert pick_least_bones_row(rows) == 1


class TestResolveTurn:
    def _mini_game_state(self) -> GameState:
        p1 = PlayerState(id="p1", hand=[make_card(60), make_card(5)])
        p2 = PlayerState(id="p2", hand=[make_card(61), make_card(6)])
        rows = [
            Row(cards=[make_card(10)]),
            Row(cards=[make_card(20)]),
            Row(cards=[make_card(30)]),
            Row(cards=[make_card(40)]),
        ]
        return GameState(
            phase=GamePhase.SUBMIT,
            round_number=1,
            rows=rows,
            players=[p1, p2],
            deck=Deck(cards=[]),
        )

    def test_rule_a_normal_placement(self) -> None:
        state = self._mini_game_state()
        result = resolve_turn(
            state,
            {"p1": "c60", "p2": "c61"},
        )

        assert [card.value for card in result.rows[3].cards] == [40, 60, 61]
        assert result.players[0].bones_total == 0
        assert result.players[1].bones_total == 0

    def test_rule_b_full_row_collection(self) -> None:
        state = GameState(
            phase=GamePhase.SUBMIT,
            round_number=1,
            rows=[
                Row(cards=[make_card(v) for v in (41, 42, 43, 44, 45)]),
                Row(cards=[make_card(10)]),
                Row(cards=[make_card(20)]),
                Row(cards=[make_card(30)]),
            ],
            players=[
                PlayerState(id="p1", hand=[make_card(46)]),
                PlayerState(id="p2", hand=[make_card(11)]),
            ],
            deck=Deck(cards=[]),
        )

        result = resolve_turn(state, {"p1": "c46", "p2": "c11"})

        assert [card.value for card in result.rows[0].cards] == [46]
        assert [card.value for card in result.rows[1].cards] == [10, 11]
        assert result.players[0].bones_total == sum(
            bones(v) for v in (41, 42, 43, 44, 45)
        )

    def test_rule_c_auto_pick_least_bones_row(self) -> None:
        state = GameState(
            phase=GamePhase.SUBMIT,
            round_number=1,
            rows=[
                Row(cards=[make_card(55)]),  # 7 bones
                Row(cards=[make_card(7)]),  # 1 bone
                Row(cards=[make_card(11)]),  # 5 bones
                Row(cards=[make_card(10)]),  # 3 bones
            ],
            players=[
                PlayerState(id="p1", hand=[make_card(3)]),
                PlayerState(id="p2", hand=[make_card(99)]),
            ],
            deck=Deck(cards=[]),
        )

        result = resolve_turn(state, {"p1": "c3", "p2": "c99"})

        assert result.players[0].bones_total == 1
        assert [card.value for card in result.rows[1].cards] == [3]

    def test_submission_barrier_blocks_partial_resolve(self) -> None:
        state = self._mini_game_state()
        submissions = {"p1": "c60"}

        assert all_submissions_received(state, submissions) is False
        with pytest.raises(ValueError, match="all active players"):
            resolve_turn(state, submissions)

    def test_two_player_mini_game_two_rounds(self) -> None:
        state = self._mini_game_state()

        after_round_one = resolve_turn(state, {"p1": "c60", "p2": "c61"})
        assert after_round_one.phase == GamePhase.SUBMIT
        assert len(after_round_one.players[0].hand) == 1
        assert len(after_round_one.players[1].hand) == 1

        after_round_two = resolve_turn(
            after_round_one,
            {"p1": "c5", "p2": "c6"},
        )
        assert after_round_two.phase == GamePhase.FINISHED
        assert all(not player.hand for player in after_round_two.players)
        assert after_round_two.winner_ids is not None
        assert len(after_round_two.winner_ids) >= 1


class TestStartGame:
    def test_seeds_four_rows_and_deals_hands(self) -> None:
        state = start_game(["p1", "p2"], rng=random.Random(0))

        assert state.phase == GamePhase.SUBMIT
        assert len(state.rows) == 4
        assert all(len(row.cards) == 1 for row in state.rows)
        assert len(state.players[0].hand) == 10
        assert len(state.players[1].hand) == 10


class TestWinnerIds:
    def test_shared_victory_on_tie(self) -> None:
        assert winner_ids({"p1": 5, "p2": 5}) == ["p1", "p2"]

    def test_single_winner(self) -> None:
        assert winner_ids({"p1": 3, "p2": 7}) == ["p1"]
