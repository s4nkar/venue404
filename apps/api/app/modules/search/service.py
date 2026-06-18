from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_
from app.modules.search.schemas import SearchParams, SearchResult
from app.modules.venue.models import Venue, VenueCategory, VenueStatus, VenuePhoto
from app.shared.pagination import Page

def search(db: Session, params: SearchParams) -> Page[SearchResult]:
    query = (
        db.query(Venue)
        .options(joinedload(Venue.category))
        .filter(
            Venue.status == VenueStatus.approved,
            Venue.is_active == True,
            Venue.deleted_at.is_(None),
        )
    )

    if params.q:
        search_term = f"%{params.q}%"
        query = query.filter(
            or_(
                Venue.name.ilike(search_term),
                Venue.description.ilike(search_term),
                Venue.city.ilike(search_term),
                Venue.state.ilike(search_term),
            )
        )

    if params.city:
        query = query.filter(Venue.city.ilike(f"%{params.city}%"))

    if params.venue_type:
        query = query.join(VenueCategory, Venue.category_id == VenueCategory.id).filter(
            VenueCategory.slug == params.venue_type
        )

    if params.capacity > 0:
        query = query.filter(Venue.max_capacity >= params.capacity)

    total_count = query.count()

    offset = (params.page - 1) * params.page_size
    venues = query.order_by(Venue.created_at.desc()).offset(offset).limit(params.page_size).all()

    venue_ids = [v.id for v in venues]
    cover_photos = {}
    if venue_ids:
        photos = db.query(VenuePhoto).filter(
            VenuePhoto.venue_id.in_(venue_ids),
            VenuePhoto.is_cover == True,
            VenuePhoto.deleted_at.is_(None),
        ).all()
        cover_photos = {p.venue_id: p.image_url for p in photos}

    results = []
    for v in venues:
        starting_price = v.starting_price_paise if v.pricing_mode in ('flat', 'mixed') else v.hourly_rate_paise
        results.append(SearchResult(
            id=v.id,
            name=v.name,
            city=v.city,
            category=v.category,
            capacity=v.max_capacity,
            pricing_mode=v.pricing_mode,
            starting_price_paise=starting_price,
            cover_photo_url=cover_photos.get(v.id),
        ))

    return Page(
        items=results,
        total=total_count,
        page=params.page,
        page_size=params.page_size,
    )
