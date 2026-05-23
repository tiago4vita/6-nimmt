from __future__ import annotations

import strawberry

from app.graphql.resolvers import Mutation, Query
from app.graphql.subscriptions import Subscription

schema = strawberry.Schema(query=Query, mutation=Mutation, subscription=Subscription)
