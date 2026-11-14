from depazo.infrastructure.persistence.database import unique_statement_name, with_async_driver


def test_prepared_statements_get_unique_names_for_transaction_poolers() -> None:
    names = {unique_statement_name() for _ in range(100)}

    assert len(names) == 100


def test_plain_postgres_urls_use_the_async_driver() -> None:
    url = with_async_driver("postgres://user@pooler.example.com:6543/postgres")

    assert url == "postgresql+asyncpg://user@pooler.example.com:6543/postgres"
